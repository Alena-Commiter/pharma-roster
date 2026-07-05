import pulp
from typing import List, Dict, Any, Tuple

# Helper to map day of week index to name
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def run_feasibility_checks(
    employees: List[Dict[str, Any]],
    shifts: List[Dict[str, Any]],
    absences: List[Dict[str, Any]]
) -> Tuple[bool, str]:
    """
    Run capacity and coverage pre-checks to verify if scheduling is possible.
    Returns (is_feasible, error_message).
    """
    if not employees:
        return False, "No employees registered. Please add employees first."
    if not shifts:
        return False, "No shift requirements configured. Please configure shifts first."

    # Group employees by role
    pharmacists = [e for e in employees if e["role"].lower() == "pharmacist"]
    preparators = [e for e in employees if e["role"].lower() == "preparator"]

    # 1. Total weekly capacity vs required hours check
    total_req_pharm_hours = sum(s["required_pharmacists"] * (s["end_hour"] - s["start_hour"]) for s in shifts)
    total_req_prep_hours = sum(s["required_preparators"] * (s["end_hour"] - s["start_hour"]) for s in shifts)

    total_avail_pharm_hours = sum(e["max_weekly_hours"] for e in pharmacists)
    total_avail_prep_hours = sum(e["max_weekly_hours"] for e in preparators)

    if total_avail_pharm_hours < total_req_pharm_hours:
        return False, (
            f"Insufficient pharmacist hours. Total pharmacist weekly capacity is {total_avail_pharm_hours}h, "
            f"but the shifts require {total_req_pharm_hours}h in total."
        )

    if total_avail_prep_hours < total_req_prep_hours:
        return False, (
            f"Insufficient preparator hours. Total preparator weekly capacity is {total_avail_prep_hours}h, "
            f"but the shifts require {total_req_prep_hours}h in total."
        )

    # 2. Shift-by-shift coverage checking for simple overlaps with absences
    for s in shifts:
        day = s["day_of_week"]
        start = s["start_hour"]
        end = s["end_hour"]
        req_pharm = s["required_pharmacists"]
        req_prep = s["required_preparators"]
        shift_name = s["name"]
        day_name = DAY_NAMES[day]

        # Count available employees of each role for this day/time
        avail_pharm = 0
        avail_prep = 0

        # Check absences for each employee
        for e in employees:
            # Check if employee has an absence that overlaps with this shift
            is_absent = False
            for a in absences:
                if a["employee_id"] == e["id"] and a["day_of_week"] == day:
                    # Overlap if absence start < shift end AND absence end > shift start
                    if a["start_hour"] < end and a["end_hour"] > start:
                        is_absent = True
                        break
            
            if not is_absent:
                if e["role"].lower() == "pharmacist":
                    avail_pharm += 1
                elif e["role"].lower() == "preparator":
                    avail_prep += 1

        if avail_pharm < req_pharm:
            return False, (
                f"Not enough pharmacists available to cover the '{shift_name}' shift on {day_name} "
                f"({start:02d}:00-{end:02d}:00). Required: {req_pharm}, Available: {avail_pharm}."
            )

        if avail_prep < req_prep:
            return False, (
                f"Not enough preparators available to cover the '{shift_name}' shift on {day_name} "
                f"({start:02d}:00-{end:02d}:00). Required: {req_prep}, Available: {avail_prep}."
            )

    return True, ""

def optimize_schedule(
    employees: List[Dict[str, Any]],
    shifts: List[Dict[str, Any]],
    absences: List[Dict[str, Any]]
) -> Tuple[bool, str, List[Dict[str, Any]]]:
    """
    Formulate and solve the weekly schedule optimization using PuLP.
    Returns (is_success, status_message, list_of_schedule_records).
    """
    # 1. Run feasibility pre-checks
    is_feasible, error_msg = run_feasibility_checks(employees, shifts, absences)
    if not is_feasible:
        return False, error_msg, []

    # 2. Initialize PuLP problem
    prob = pulp.LpProblem("Pharmacy_Scheduling", pulp.LpMinimize)

    # 3. Create Decision Variables (y[e, s] indicates if employee e is assigned to shift s)
    y = {}
    for e in employees:
        for s in shifts:
            var_name = f"assign_emp_{e['id']}_shift_{s['id']}"
            
            # Check if this employee has an absence that overlaps with this shift
            is_absent = False
            for a in absences:
                if a["employee_id"] == e["id"] and a["day_of_week"] == s["day_of_week"]:
                    if a["start_hour"] < s["end_hour"] and a["end_hour"] > s["start_hour"]:
                        is_absent = True
                        break
            
            if is_absent:
                # If absent, bind variable to exactly 0 by setting low and up bounds to 0
                y[(e["id"], s["id"])] = pulp.LpVariable(var_name, lowBound=0, upBound=0, cat=pulp.LpBinary)
            else:
                y[(e["id"], s["id"])] = pulp.LpVariable(var_name, cat=pulp.LpBinary)

    # 4. Objective Function: Minimize total hours worked (avoid overstaffing)
    obj_expr = []
    for e in employees:
        for s in shifts:
            duration = s["end_hour"] - s["start_hour"]
            obj_expr.append(duration * y[(e["id"], s["id"])])
    prob += pulp.lpSum(obj_expr)

    # 5. Constraints

    # A. Weekly Hours per Employee
    for e in employees:
        week_expr = []
        for s in shifts:
            duration = s["end_hour"] - s["start_hour"]
            week_expr.append(duration * y[(e["id"], s["id"])])
        prob += (pulp.lpSum(week_expr) <= e["max_weekly_hours"]), f"Weekly_Hours_Emp_{e['id']}"

    # B. Max Hours per Day per Employee
    for e in employees:
        for day in range(7):
            day_expr = []
            has_shifts = False
            for s in shifts:
                if s["day_of_week"] == day:
                    duration = s["end_hour"] - s["start_hour"]
                    day_expr.append(duration * y[(e["id"], s["id"])])
                    has_shifts = True
            if has_shifts:
                prob += (pulp.lpSum(day_expr) <= e["max_daily_hours"]), f"Daily_Hours_Emp_{e['id']}_Day_{day}"

    # C. At Most One Shift per Day per Employee (One-shift-per-day rule)
    for e in employees:
        for day in range(7):
            day_shifts = []
            has_shifts = False
            for s in shifts:
                if s["day_of_week"] == day:
                    day_shifts.append(y[(e["id"], s["id"])])
                    has_shifts = True
            if has_shifts:
                prob += (pulp.lpSum(day_shifts) <= 1), f"One_Shift_Emp_{e['id']}_Day_{day}"

    # D. Shift Staffing Requirements
    for s in shifts:
        # Pharmacist coverage requirement
        pharm_vars = [y[(e["id"], s["id"])] for e in employees if e["role"].lower() == "pharmacist"]
        prob += (pulp.lpSum(pharm_vars) >= s["required_pharmacists"]), f"Req_Pharm_Shift_{s['id']}"
        
        # Preparator coverage requirement
        prep_vars = [y[(e["id"], s["id"])] for e in employees if e["role"].lower() == "preparator"]
        prob += (pulp.lpSum(prep_vars) >= s["required_preparators"]), f"Req_Prep_Shift_{s['id']}"

    # 6. Solve using CBC solver (comes packaged with pulp)
    solver = pulp.PULP_CBC_CMD(msg=False)
    prob.solve(solver)

    # 7. Check Solution Status
    if pulp.LpStatus[prob.status] != "Optimal":
        return False, (
            "Solver could not find a feasible schedule. This is typically due to tight employee hour limits, "
            "overlapping shifts, or high shift requirements matching with absences. Please try relaxing your constraints."
        ), []

    # 8. Extract Assignments
    schedule_records = []
    for e in employees:
        for s in shifts:
            val = y[(e["id"], s["id"])].varValue
            if val is not None and val > 0.5:
                schedule_records.append({
                    "employee_id": e["id"],
                    "day_of_week": s["day_of_week"],
                    "shift_requirement_id": s["id"]
                })

    return True, "Schedule optimized successfully!", schedule_records
