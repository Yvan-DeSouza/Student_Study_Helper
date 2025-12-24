from app.extensions import db
from datetime import datetime, timezone
from sqlalchemy import func, text

class Assignment(db.Model):
    __tablename__ = "assignments"

    assignment_id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.class_id"), nullable=False)
    title = db.Column(db.Text, nullable=False)
    assignment_type = db.Column(db.Text, nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    estimated_minutes = db.Column(db.Integer)
    is_graded = db.Column(db.Boolean, nullable=False, default=False, server_default=text('false'))
    ponderation = db.Column(db.Integer)
    is_completed = db.Column(db.Boolean, default=False, server_default=text('false'), nullable=False)
    grade = db.Column(db.Numeric)
    expected_grade = db.Column(db.Numeric)
    difficulty = db.Column(db.Integer)
    pass_grade = db.Column(db.Numeric)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())
    finish_date = db.Column(db.DateTime(timezone=True), nullable=True)

    class_ = db.relationship("Class", back_populates="assignments")
    study_sessions = db.relationship(
        "StudySession", back_populates="assignment", cascade="all, delete-orphan"
    )
    expected_grades = db.relationship("AssignmentExpectedGrade", back_populates="assignment", cascade="all, delete-orphan")

class AssignmentExpectedGrade(db.Model):
    __tablename__ = "assignment_expected_grades"

    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignments.assignment_id"), nullable=False)
    expected_grade = db.Column(db.Numeric, nullable=False)
    recorded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    assignment = db.relationship("Assignment", back_populates="expected_grades")
