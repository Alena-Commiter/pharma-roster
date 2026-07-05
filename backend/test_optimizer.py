import pytest
from optimizer import run_feasibility_checks, optimize_schedule

def test_basic_feasible_scheduling():
    employees = [
        {"id": 1, "name": "John Doe", "role": "Pharmacist", "max_daily_hours": 8.0, "max_weekly_hours": 40.0},
        {"id": 2, "name": "Jane Smith", "role": "Preparator", "max_daily_hours": 8.0, "max_weekly_hours": 40.0},
        {"id": 3, "name": "Bob Johnson", "role": "Preparator", "max_daily_hours": 8.0, "max_weekly_hours": 40.0}
    ]
    shifts = [
        {"id": 1, "day_of_week": 0, "name": "Morning Shift", "start_hour": 8, "end_hour": 16, "required_pharmacists": 1, "required_preparators": 2}
    ]
    absences = []

    # Feasibility check
    is_feasible, error_msg = run_feasibility_checks(employees, shifts, absences)
    assert is_feasible
    assert error_msg == ""

    # Run optimizer
    success, message, results = optimize_schedule(employees, shifts, absences)
    assert success
    assert len(results) == 3  # All three should be scheduled
    
    # Check that John Doe (pharmacist) is scheduled
    scheduled_employees = [r["employee_id"] for r in results]
    assert 1 in scheduled_employees
    assert 2 in scheduled_employees
    assert 3 in scheduled_employees

def test_insufficient_hours_feasibility():
    employees = [
        # Only 10 hours capacity
        {"id": 1, "name": "John Doe", "role": "Pharmacist", "max_daily_hours": 8.0, "max_weekly_hours": 10.0}
    ]
    shifts = [
        # Requires two shifts of 8 hours each (16 hours total required)
        {"id": 1, "day_of_week": 0, "name": "Mon Morning", "start_hour": 8, "end_hour": 16, "required_pharmacists": 1, "required_preparators": 0},
        {"id": 2, "day_of_week": 1, "name": "Tue Morning", "start_hour": 8, "end_hour": 16, "required_pharmacists": 1, "required_preparators": 0}
    ]
    absences = []

    is_feasible, error_msg = run_feasibility_checks(employees, shifts, absences)
    assert not is_feasible
    assert "Insufficient pharmacist hours" in error_msg

def test_absence_conflict_pre_check():
    employees = [
        {"id": 1, "name": "John Doe", "role": "Pharmacist", "max_daily_hours": 8.0, "max_weekly_hours": 40.0}
    ]
    shifts = [
        {"id": 1, "day_of_week": 0, "name": "Morning", "start_hour": 8, "end_hour": 16, "required_pharmacists": 1, "required_preparators": 0}
    ]
    absences = [
        # Absent on Monday 8-16 (overlaps with shift)
        {"id": 1, "employee_id": 1, "day_of_week": 0, "start_hour": 8, "end_hour": 12}
    ]

    is_feasible, error_msg = run_feasibility_checks(employees, shifts, absences)
    assert not is_feasible
    assert "Not enough pharmacists available" in error_msg

def test_one_shift_per_day_milp():
    employees = [
        {"id": 1, "name": "John Doe", "role": "Pharmacist", "max_daily_hours": 8.0, "max_weekly_hours": 40.0},
        {"id": 2, "name": "Jane Smith", "role": "Pharmacist", "max_daily_hours": 8.0, "max_weekly_hours": 40.0}
    ]
    shifts = [
        # Two shifts on the same day, each requiring 1 pharmacist
        {"id": 1, "day_of_week": 0, "name": "Mon Morning", "start_hour": 8, "end_hour": 16, "required_pharmacists": 1, "required_preparators": 0},
        {"id": 2, "day_of_week": 0, "name": "Mon Afternoon", "start_hour": 13, "end_hour": 21, "required_pharmacists": 1, "required_preparators": 0}
    ]
    absences = []

    is_feasible, error_msg = run_feasibility_checks(employees, shifts, absences)
    assert is_feasible  # Should pass capacity pre-checks (we have 2 pharmacists total, and 16 hours required, and 80 hours capacity)

    success, message, results = optimize_schedule(employees, shifts, absences)
    assert success
    assert len(results) == 2
    
    # Verify that each employee works at most one shift (one-shift-per-day rule)
    assigned_shifts = {}
    for r in results:
        emp_id = r["employee_id"]
        assigned_shifts[emp_id] = assigned_shifts.get(emp_id, 0) + 1
    
    for emp_id, count in assigned_shifts.items():
        assert count == 1
