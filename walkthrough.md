# PharmaRoster - Pharmacy Employee Schedule Planner Walkthrough

PharmaRoster is a web-based pharmacy employee scheduling application. It uses Mixed-Integer Linear Programming (MILP) in Python to automatically generate schedules that satisfy employee daily/weekly limits, shift times, coverage requirements, and planned absences.

This document summarizes the final project setup, technical architecture, database seeding, and cloud deployment procedures on GitHub, Render, and Vercel.

---

## Technical Architecture

The application is structured as a monorepo containing a Python backend and a React/Next.js frontend:

```
/Users/alena/sipha-project/
├── backend/
│   ├── database.py       # SQLite connection setup using SQLAlchemy
│   ├── models.py         # Table declarations (Employee, Shift, Absence, ScheduleResult)
│   ├── optimizer.py      # PuLP / CBC optimization engine & pre-checks
│   ├── main.py           # FastAPI endpoints & auto-seeding hook
│   ├── seed_demo.py      # Seeding script for demo data
│   ├── test_optimizer.py # Unit tests for constraints and solver logic
│   └── requirements.txt  # Python packages list
└── frontend/
    ├── pages/
    │   ├── _app.tsx      # Sidebar layout & page wrapper
    │   ├── index.tsx     # Dashboard, Reset Demo, and Schedule visualizer grid
    │   ├── employees.tsx # Employee roster & planned absences management
    │   └── settings.tsx  # Shift operating hours & target coverage config
    └── styles/
        └── globals.css   # Premium dark mode & CSS design system
```

---

## What Was Built

### 1. Operations Research Solver (`optimizer.py`)
Formulates and solves the scheduling model using **PuLP** and the default CBC solver:
*   **Variable**: Binary decision variable $y_{e, s} \in \{0, 1\}$ (assign employee $e$ to shift $s$).
*   **Constraints**:
    *   *Total Weekly Capacity*: Assigned shift durations cannot exceed the employee's weekly contract hours.
    *   *Daily Limits*: Assigned shifts on any day cannot exceed the employee's max daily hours.
    *   *Absence Protection*: Force $y_{e, s} = 0$ if any hour of shift $s$ overlaps with employee $e$'s logged absences.
    *   *One Shift Per Day*: Employees can be assigned to at most one shift per day.
    *   *Role Staffing Coverage*: Ensures each shift is covered by at least the required number of Pharmacists and Preparators.
*   **Objective Function**: Minimizes total scheduled hours to prevent overstaffing while meeting coverage requirements.

### 2. FastAPI API & Data Validation (`main.py`)
Exposes CRUD endpoints for employees, shifts, absences, and schedules:
*   `POST /validate`: Performs capacity and shift-by-shift coverage pre-checks. Returns detailed error descriptions if requirements exceed staff hours or overlaps occur.
*   `POST /optimize`: Clears the old schedule, runs the PuLP optimizer, and commits results to the database.
*   `POST /seed`: Dynamically seeds the database with the default demo dataset.
*   *Auto-Seeding*: On API startup, if the database is detected as empty (e.g. after a server restart), it automatically seeds the demo dataset.

### 3. Next.js Web UI (`index.tsx`, `employees.tsx`, `settings.tsx`)
A dark-themed dashboard styled with a custom glassmorphism design:
*   **Dashboard**: Shows stats, the main schedule calendar grid, a **"Validate Inputs"** check, and the **"Generate Schedule"** trigger.
*   **"Reset Demo Data" Button**: Resets the database and populates the live site with the 7-employee demo dataset.
*   **Forms**: Standard inputs to manage employees, shifts, and absences directly in the app.

---

## Database Seeding (Demo Data)

The app comes pre-configured with a default test dataset (defined in `seed_demo.py`):
1.  **7 Employees**:
    *   3 Pharmacists (A, B, C) with weekly hour limits of 36h, 33h, and 36h.
    *   4 Preparators (A, B, C, D) with limits of 32h, 36h, 39h, and 35h.
2.  **2 Planned Absences**:
    *   Pharmacist A is absent on Monday Morning (`08:00 - 16:00`).
    *   Preparator B is absent on Tuesday Afternoon (`13:00 - 21:00`).
3.  **12 Weekly Shifts** (Monday - Saturday):
    *   Morning Shift (`08:00 - 16:00`) requiring 1 Pharmacist and 1 Preparator.
    *   Afternoon Shift (`13:00 - 21:00`) requiring 1 Pharmacist and 1 Preparator.

---

## Version Control & GitHub

We initialized Git in the repository root and pushed the code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: PharmaRoster application with PuLP scheduler"
git branch -M main
git remote add origin https://github.com/Alena-Commiter/pharma-roster.git
git push -u origin main
```

---

## Web Deployment & Hosting

The application is hosted on free cloud tiers:

### 1. Backend API (Render)
*   **Service Type**: Free Web Service.
*   **Source**: Connected directly to the GitHub repo `Alena-Commiter/pharma-roster`.
*   **Root Directory**: `backend`
*   **Runtime**: `Python`
*   **Build Command**: `pip install -r requirements.txt`
*   **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
*   *Note on Free Tier*: Render instances sleep after 15 minutes of inactivity. When a judge visits the site, it will take 30-40 seconds for the backend to wake up. The app has a loading message warning visitors of this delay. When it wakes up, it automatically seeds the database.

### 2. Frontend User Interface (Vercel)
*   **Service Type**: Hobby (Free).
*   **Source**: Connected to the same GitHub repo.
*   **Framework Preset**: `Next.js`
*   **Root Directory**: `frontend`
*   **Environment Variables**:
    *   `NEXT_PUBLIC_API_URL` = `https://pharma-roster.onrender.com` (tells the React frontend where to find the database).
*   **Deployment Protection**: Disabled (makes the website publicly viewable by judges without a Vercel login).

---

## Live Links

*   **Live Web Application (Vercel)**: **[https://pharma-roster.vercel.app](https://pharma-roster.vercel.app)**
*   **Backend API Documentation (Render)**: **[https://pharma-roster.onrender.com/docs](https://pharma-roster.onrender.com/docs)**
*   **GitHub Code Repository**: **[https://github.com/Alena-Commiter/pharma-roster](https://github.com/Alena-Commiter/pharma-roster)**
