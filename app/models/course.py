from app.extensions import db
from datetime import datetime

class Class(db.Model):
    __tablename__ = "classes"

    class_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)

    class_name = db.Column(db.Text, nullable=False)
    class_type = db.Column(db.Text, nullable=False)
    class_code = db.Column(db.Text, nullable=False)
    color = db.Column(db.Text)
    grade = db.Column(db.Numeric)  # optional
    importance = db.Column(db.Text)  # optional: 'high', 'medium', 'low'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="classes")
    assignments = db.relationship("Assignment", back_populates="class_", cascade="all, delete-orphan")
    study_sessions = db.relationship("StudySession", back_populates="class_", cascade="all, delete-orphan")
