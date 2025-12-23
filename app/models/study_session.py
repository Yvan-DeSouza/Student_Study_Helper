from app.extensions import db
from datetime import datetime, timezone
from sqlalchemy import func
class StudySession(db.Model):
    __tablename__ = "study_sessions"

    session_id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.class_id"), nullable=False)
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignments.assignment_id"), nullable=True)
    session_date = db.Column(db.Date, nullable=False)
    duration_minutes = db.Column(db.Integer)
    expected_duration_minutes = db.Column(db.Integer)
    session_type = db.Column(db.Text)
    session_end = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())

    class_ = db.relationship("Class", back_populates="study_sessions")
    assignment = db.relationship("Assignment", back_populates="study_sessions")
