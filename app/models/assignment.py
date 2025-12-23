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
    completed = db.Column(db.Boolean, default=False, server_default=text('false'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())

    class_ = db.relationship("Class", back_populates="assignments")
    study_sessions = db.relationship(
        "StudySession", back_populates="assignment", cascade="all, delete-orphan"
    )
