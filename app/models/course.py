from app.extensions import db
from datetime import datetime, timezone
from sqlalchemy import func, text
from app.models.study_session import StudySession
from app.models.assignment import Assignment
class Class(db.Model):
    __tablename__ = "classes"

    class_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)

    class_name = db.Column(db.Text, nullable=False)
    class_type = db.Column(db.Text, nullable=False)
    class_code = db.Column(db.Text, nullable=False)
    color = db.Column(db.Text, nullable=False)
    grade = db.Column(db.Numeric)  # optional
    importance = db.Column(db.Text)  # optional: 'high', 'medium', 'low'

    is_finished = db.Column(db.Boolean, nullable=False, default=False, server_default=text('false'))
    finish_date = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    user = db.relationship("User", back_populates="classes")
    assignments = db.relationship("Assignment", back_populates="class_", cascade="all, delete-orphan")
    study_sessions = db.relationship("StudySession", back_populates="class_", cascade="all, delete-orphan")

    @property
    def total_assignments(self):
        return Assignment.query.filter_by(class_id=self.class_id).count()

    @property
    def completed_assignments(self):
        return Assignment.query.filter_by(
            class_id=self.class_id,
            completed=True
        ).count()

    @property
    def total_study_sessions(self):
        return StudySession.query.filter_by(
            class_id=self.class_id
        ).count()

    @property
    def total_study_time(self):
        # assumes duration_minutes exists
        total = db.session.query(
            db.func.coalesce(db.func.sum(StudySession.duration_minutes), 0)
        ).filter_by(class_id=self.class_id).scalar()

        return f"{total} min"