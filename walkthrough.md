# Pharmacy Employee Schedule Planner Walkthrough

The Pharmacy Employee Schedule Planner has been successfully implemented and tested. Below is a walkthrough of the changes, the technical architecture, and validation steps.

## Technical Architecture

The application is structured as a monorepo containing a Python backend and a React/Next.js frontend:

```
/Users/alena/sipha-project/
├── backend/
│   ├── database.py       # SQLite connection setup using SQLAlchemy
│   ├── models.py         # Table declarations (Employee, Shift, Absence, ScheduleResult)
│   ├── optimizer.py      # SciPy MILP optimization engine & pre-checks
│   ├── main.py           # FastAPI endpoints
│   ├── test_optimizer.py # Unit tests for constraints and solver logic
│   └── requirements.txt  # Python packages list
└── frontend/
    ├── pages/
    │   ├── _app.tsx      # Sidebar layout & page wrapper
    │   ├── index.tsx     # Dashboard & Schedule visualizer grid
    │   ├── employees.tsx # Employee roster & planned absences
    │   └── settings.tsx  # Shift operating hours & target coverage
    └── styles/
        └── globals.css   # Premium dark mode & CSS design system
```

---

## What Was Built

### 1. Mixed-Integer Linear Programming Solver (`optimizer.py`)
Utilizes `scipy.optimize.milp` to assign employees to shifts while satisfying the following rules:
*   **Capacity constraint**: Limit total weekly working hours per employee.
*   **Daily constraint**: Limit max working hours per day.
*   **Availability constraint**: Zero-out shift options overlapping with planned employee absences.
*   **Coverage constraint**: Ensure shift staffing meets requirements.
*   **Single shift constraint**: Limit employees to at most one shift per day.
*   **Objective function**: Minimizes total hours assigned to keep schedules cost-effective.
*   **Capacity Checks**: Pre-validates total staff capacity vs. shift demands to catch shortfalls early.

### 2. FastAPI API Layer (`main.py`)
Exposes JSON endpoints for full CRUD on employees, absences, and shifts, as well as:
*   `POST /validate`: Runs capacity pre-checks and returns descriptive error notifications if infeasible.
*   `POST /optimize`: Runs the MILP solver, clears the current schedule, and saves results.
*   `GET /schedule`: Joins records to return the completed schedule.

### 3. Next.js Web UI (`index.tsx`, `employees.tsx`, `settings.tsx`)
A dashboard styled with a custom dark glassmorphism system:
*   **Settings Screen**: Edit daily/weekly shifts and configure pharmacist and preparator coverage requirements.
*   **Employees Screen**: Manage the staff roster and schedule planned absences (with overlap rules).
*   **Dashboard Screen**:
    *   Features a **Validate Inputs** button that checks feasibility before generating.
    *   Displays an **Alert Panel** detailing specific errors if capacity is exceeded.
    *   Features a **Generate Schedule** button (unlocked upon validation success) that triggers the solver and renders the output schedule in a clean calendar grid.

---

## Verification Results

### Automated Unit Tests
*   `test_optimizer.py` ran successfully and verified constraints:
    *   `test_basic_feasible_scheduling`: Confirmed correct allocation under valid conditions.
    *   `test_insufficient_hours_feasibility`: Checked that capacity shortfall was successfully caught in pre-checks.
    *   `test_absence_conflict_pre_check`: Checked that absences overlapping with shifts correctly trigger warning alerts.
    *   `test_one_shift_per_day_milp`: Confirmed employees are never scheduled for two shifts on the same day.

### Local Testing URLs
*   **Frontend**: [http://localhost:3000](http://localhost:3000)
*   **Backend documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
