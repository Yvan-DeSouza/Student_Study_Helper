from app.extensions import db
from datetime import datetime, timezone
from sqlalchemy import func, text

class StudySession(db.Model):
    __tablename__ = "study_sessions"

    session_id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.class_id"), nullable=False)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False
    )


    assignment_id = db.Column(db.Integer, db.ForeignKey("assignments.assignment_id"), nullable=True)
    
    title = db.Column(db.Text, nullable=False)

    duration_minutes = db.Column(db.Integer)  # total time
    expected_duration_minutes = db.Column(db.Integer)
    session_type = db.Column(db.Text, nullable=False)  # homework, project, etc.


    is_active = db.Column(db.Boolean, nullable=False, default=False, server_default=text('false'))
    is_completed = db.Column(db.Boolean, nullable=False, default=False, server_default=text('false'))
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)
    started_at = db.Column(db.DateTime(timezone=True), nullable=False)
    session_end = db.Column(db.DateTime(timezone=True), nullable=True)
    cancelled_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Relationships
    class_ = db.relationship("Class", back_populates="study_sessions")
    assignment = db.relationship("Assignment", back_populates="study_sessions")
    user = db.relationship("User")
    # Optional properties for convenience
    @property
    def total_time(self):
        """Returns the duration in minutes if available."""
        return self.duration_minutes


    # Optional: consistency check
    def is_valid(self):
        if self.is_active and self.is_completed:
            return False

        if self.is_completed:
            return self.session_end is not None and self.duration_minutes is not None

        # not completed
        return self.session_end is None and self.duration_minutes is None

    @property
    def session_date(self):
        return self.started_at.date() if self.started_at else None
