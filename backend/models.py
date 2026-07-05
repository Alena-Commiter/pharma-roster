from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "Pharmacist" or "Preparator"
    max_daily_hours = Column(Float, default=8.0)
    max_weekly_hours = Column(Float, default=35.0)

    absences = relationship("Absence", back_populates="employee", cascade="all, delete-orphan")
    schedule_results = relationship("ScheduleResult", back_populates="employee", cascade="all, delete-orphan")

class ShiftRequirement(Base):
    __tablename__ = "shift_requirements"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0 = Monday, 6 = Sunday
    name = Column(String, nullable=False)          # e.g., "Morning Shift", "Afternoon Shift"
    start_hour = Column(Integer, nullable=False)   # 0 to 23
    end_hour = Column(Integer, nullable=False)     # 0 to 23
    required_pharmacists = Column(Integer, default=0)
    required_preparators = Column(Integer, default=0)

    schedule_results = relationship("ScheduleResult", back_populates="shift_requirement", cascade="all, delete-orphan")

class Absence(Base):
    __tablename__ = "absences"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0 to 6
    start_hour = Column(Integer, nullable=False)   # 0 to 23
    end_hour = Column(Integer, nullable=False)     # 0 to 23

    employee = relationship("Employee", back_populates="absences")

class ScheduleResult(Base):
    __tablename__ = "schedule_results"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0 to 6
    shift_requirement_id = Column(Integer, ForeignKey("shift_requirements.id"), nullable=False)

    employee = relationship("Employee", back_populates="schedule_results")
    shift_requirement = relationship("ShiftRequirement", back_populates="schedule_results")
