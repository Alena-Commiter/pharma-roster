import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
import models

def seed_demo_data():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Clear existing data
        db.query(models.ScheduleResult).delete()
        db.query(models.Absence).delete()
        db.query(models.ShiftRequirement).delete()
        db.query(models.Employee).delete()
        db.commit()
        
        print("Cleared existing database tables.")

        # 1. Seed Employees (3 Pharmacists, 4 Preparators)
        employees = [
            # Pharmacists (Max 36-39h per week)
            models.Employee(name="Pharmacist A", role="Pharmacist", max_daily_hours=8.0, max_weekly_hours=36.0),
            models.Employee(name="Pharmacist B", role="Pharmacist", max_daily_hours=8.0, max_weekly_hours=33.0),
            models.Employee(name="Pharmacist C", role="Pharmacist", max_daily_hours=8.0, max_weekly_hours=36.0),
            # Preparators
            models.Employee(name="Preparator A", role="Preparator", max_daily_hours=8.0, max_weekly_hours=32.0),
            models.Employee(name="Preparator B", role="Preparator", max_daily_hours=8.0, max_weekly_hours=36.0),
            models.Employee(name="Preparator C", role="Preparator", max_daily_hours=8.0, max_weekly_hours=39.0),
            models.Employee(name="Preparator D", role="Preparator", max_daily_hours=8.0, max_weekly_hours=35.0),
        ]
        for emp in employees:
            db.add(emp)
        db.commit()
        
        # Refresh to get IDs
        for emp in employees:
            db.refresh(emp)
            
        print(f"Seeded {len(employees)} employees.")

        # Find specific employees to assign absences to
        emp_pharm_a = next(e for e in employees if e.name == "Pharmacist A")
        emp_prep_b = next(e for e in employees if e.name == "Preparator B")

        # 2. Seed Absences (2 employees have absences)
        absences = [
            # Pharmacist A is absent on Monday (Day 0) Morning Shift hours (8:00 - 16:00)
            models.Absence(employee_id=emp_pharm_a.id, day_of_week=0, start_hour=8, end_hour=16),
            # Preparator B is absent on Tuesday (Day 1) Afternoon Shift hours (13:00 - 21:00)
            models.Absence(employee_id=emp_prep_b.id, day_of_week=1, start_hour=13, end_hour=21),
        ]
        for ab in absences:
            db.add(ab)
        db.commit()
        print(f"Seeded {len(absences)} planned absences.")

        # 3. Seed Shift Requirements (Monday to Saturday, Morning & Afternoon shifts)
        shifts = []
        days_to_seed = [0, 1, 2, 3, 4, 5]  # Monday (0) to Saturday (5)
        
        for day in days_to_seed:
            # Morning Shift: 08:00 - 16:00
            # Req: 1 Pharmacist, 1 Preparator
            morning = models.ShiftRequirement(
                day_of_week=day,
                name="Morning Shift",
                start_hour=8,
                end_hour=16,
                required_pharmacists=1,
                required_preparators=1
            )
            # Afternoon Shift: 13:00 - 21:00
            # Req: 1 Pharmacist, 1 Preparator
            afternoon = models.ShiftRequirement(
                day_of_week=day,
                name="Afternoon Shift",
                start_hour=13,
                end_hour=21,
                required_pharmacists=1,
                required_preparators=1
            )
            db.add(morning)
            db.add(afternoon)
            shifts.extend([morning, afternoon])
            
        db.commit()
        print(f"Seeded {len(shifts)} shift requirements (Monday - Saturday).")
        print("Database seeded with demo data successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
