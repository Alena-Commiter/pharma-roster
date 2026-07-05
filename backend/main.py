import os
import sys

# Add the backend directory to the Python path to allow absolute imports
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, Base
from models import Employee, ShiftRequirement, Absence, ScheduleResult  # noqa: ensure models are registered
from optimizer import run_feasibility_checks, optimize_schedule
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Tuple
from pydantic import BaseModel, Field
from database import get_db

# Initialize tables on startup
Base.metadata.create_all(bind=engine)

# Auto-seed if database is empty
from database import SessionLocal
import models
db = SessionLocal()
try:
    if db.query(models.Employee).count() == 0:
        from seed_demo import seed_demo_data
        seed_demo_data()
finally:
    db.close()

app = FastAPI(title="Pharmacy Employee Schedule Planner API")

# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ────────────────────────────────────────────
# Pydantic Schemas
# ────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    name: str
    role: str  # "Pharmacist" or "Preparator"
    max_daily_hours: float = Field(default=8.0, ge=0)
    max_weekly_hours: float = Field(default=35.0, ge=0)

class EmployeeResponse(BaseModel):
    id: int
    name: str
    role: str
    max_daily_hours: float
    max_weekly_hours: float
    class Config:
        from_attributes = True

class ShiftRequirementCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    name: str
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=0, le=23)
    required_pharmacists: int = Field(default=0, ge=0)
    required_preparators: int = Field(default=0, ge=0)

class ShiftRequirementResponse(BaseModel):
    id: int
    day_of_week: int
    name: str
    start_hour: int
    end_hour: int
    required_pharmacists: int
    required_preparators: int
    class Config:
        from_attributes = True

class AbsenceCreate(BaseModel):
    employee_id: int
    day_of_week: int = Field(ge=0, le=6)
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=0, le=23)

class AbsenceResponse(BaseModel):
    id: int
    employee_id: int
    day_of_week: int
    start_hour: int
    end_hour: int
    class Config:
        from_attributes = True

class ScheduleResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    employee_role: str
    day_of_week: int
    shift_requirement_id: int
    shift_name: str
    start_hour: int
    end_hour: int
    class Config:
        from_attributes = True

# ────────────────────────────────────────────
# Helper
# ────────────────────────────────────────────

def get_solver_data(db: Session):
    employees = [
        {"id": e.id, "name": e.name, "role": e.role,
         "max_daily_hours": e.max_daily_hours, "max_weekly_hours": e.max_weekly_hours}
        for e in db.query(Employee).all()
    ]
    shifts = [
        {"id": s.id, "day_of_week": s.day_of_week, "name": s.name,
         "start_hour": s.start_hour, "end_hour": s.end_hour,
         "required_pharmacists": s.required_pharmacists, "required_preparators": s.required_preparators}
        for s in db.query(ShiftRequirement).all()
    ]
    absences = [
        {"id": a.id, "employee_id": a.employee_id, "day_of_week": a.day_of_week,
         "start_hour": a.start_hour, "end_hour": a.end_hour}
        for a in db.query(Absence).all()
    ]
    return employees, shifts, absences

# ────────────────────────────────────────────
# Employee Routes
# ────────────────────────────────────────────

@app.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    role_norm = employee.role.capitalize()
    if role_norm not in ["Pharmacist", "Preparator"]:
        raise HTTPException(status_code=400, detail="Role must be 'Pharmacist' or 'Preparator'")
    db_emp = Employee(name=employee.name, role=role_norm,
                      max_daily_hours=employee.max_daily_hours, max_weekly_hours=employee.max_weekly_hours)
    db.add(db_emp)
    db.commit()
    db.refresh(db_emp)
    return db_emp

@app.get("/employees", response_model=List[EmployeeResponse])
def get_employees(db: Session = Depends(get_db)):
    return db.query(Employee).all()

@app.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    db_emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(db_emp)
    db.commit()

# ────────────────────────────────────────────
# Shift Routes
# ────────────────────────────────────────────

@app.post("/shifts", response_model=ShiftRequirementResponse, status_code=status.HTTP_201_CREATED)
def create_shift(shift: ShiftRequirementCreate, db: Session = Depends(get_db)):
    if shift.start_hour >= shift.end_hour:
        raise HTTPException(status_code=400, detail="Start hour must be before end hour")
    db_shift = ShiftRequirement(day_of_week=shift.day_of_week, name=shift.name,
                                start_hour=shift.start_hour, end_hour=shift.end_hour,
                                required_pharmacists=shift.required_pharmacists,
                                required_preparators=shift.required_preparators)
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift

@app.get("/shifts", response_model=List[ShiftRequirementResponse])
def get_shifts(db: Session = Depends(get_db)):
    return db.query(ShiftRequirement).all()

@app.delete("/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    db_shift = db.query(ShiftRequirement).filter(ShiftRequirement.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(db_shift)
    db.commit()

# ────────────────────────────────────────────
# Absence Routes
# ────────────────────────────────────────────

@app.post("/absences", response_model=AbsenceResponse, status_code=status.HTTP_201_CREATED)
def create_absence(absence: AbsenceCreate, db: Session = Depends(get_db)):
    db_emp = db.query(Employee).filter(Employee.id == absence.employee_id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if absence.start_hour >= absence.end_hour:
        raise HTTPException(status_code=400, detail="Start hour must be before end hour")
    db_abs = Absence(employee_id=absence.employee_id, day_of_week=absence.day_of_week,
                     start_hour=absence.start_hour, end_hour=absence.end_hour)
    db.add(db_abs)
    db.commit()
    db.refresh(db_abs)
    return db_abs

@app.get("/absences", response_model=List[AbsenceResponse])
def get_absences(db: Session = Depends(get_db)):
    return db.query(Absence).all()

@app.delete("/absences/{absence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_absence(absence_id: int, db: Session = Depends(get_db)):
    db_abs = db.query(Absence).filter(Absence.id == absence_id).first()
    if not db_abs:
        raise HTTPException(status_code=404, detail="Absence not found")
    db.delete(db_abs)
    db.commit()

# ────────────────────────────────────────────
# Validate & Optimize Routes
# ────────────────────────────────────────────

@app.post("/validate")
def validate_inputs(db: Session = Depends(get_db)):
    employees, shifts, absences = get_solver_data(db)
    is_feasible, error_msg = run_feasibility_checks(employees, shifts, absences)
    if not is_feasible:
        return {"feasible": False, "message": error_msg}
    return {"feasible": True, "message": "All inputs are valid and scheduling capacity is sufficient."}

@app.post("/optimize")
def generate_schedule(db: Session = Depends(get_db)):
    employees, shifts, absences = get_solver_data(db)
    success, message, results = optimize_schedule(employees, shifts, absences)
    if not success:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)
    db.query(ScheduleResult).delete()
    for r in results:
        db.add(ScheduleResult(employee_id=r["employee_id"], day_of_week=r["day_of_week"],
                              shift_requirement_id=r["shift_requirement_id"]))
    db.commit()
    return {"message": message, "count": len(results)}

@app.post("/seed")
def seed_database_endpoint(db: Session = Depends(get_db)):
    from seed_demo import seed_demo_data
    try:
        seed_demo_data()
        return {"message": "Database seeded with demo data successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed database: {str(e)}")

@app.post("/seed")
def seed_database_endpoint(db: Session = Depends(get_db)):
    from seed_demo import seed_demo_data
    try:
        seed_demo_data()
        return {"message": "Database seeded with demo data successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed database: {str(e)}")

@app.get("/schedule", response_model=List[ScheduleResponse])
def get_schedule(db: Session = Depends(get_db)):
    results = db.query(ScheduleResult).all()
    return [
        ScheduleResponse(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=r.employee.name,
            employee_role=r.employee.role,
            day_of_week=r.day_of_week,
            shift_requirement_id=r.shift_requirement_id,
            shift_name=r.shift_requirement.name,
            start_hour=r.shift_requirement.start_hour,
            end_hour=r.shift_requirement.end_hour,
        )
        for r in results
    ]
