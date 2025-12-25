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
    teacher_name = db.Column(db.Text)
    class_type = db.Column(db.Text, nullable=False)
    class_code = db.Column(db.Text, nullable=False)
    color = db.Column(db.Text, nullable=False)
    grade = db.Column(db.Numeric)
    importance = db.Column(db.Text)
    difficulty = db.Column(db.Integer)
    pass_grade = db.Column(db.Numeric)

    is_finished = db.Column(db.Boolean, nullable=False, default=False, server_default=text('false'))
    finish_date = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    user = db.relationship("User", back_populates="classes")
    assignments = db.relationship("Assignment", back_populates="class_", cascade="all, delete-orphan")
    study_sessions = db.relationship("StudySession", back_populates="class_", cascade="all, delete-orphan")
    expected_grades = db.relationship("ClassExpectedGrade", back_populates="class_", cascade="all, delete-orphan")

    @property
    def total_assignments(self):
        return Assignment.query.filter_by(class_id=self.class_id).count()

    @property
    def completed_assignments(self):
        return Assignment.query.filter_by(
            class_id=self.class_id,
            is_completed=True
        ).count()

    @property
    def total_study_sessions(self):
        return StudySession.query.filter_by(class_id=self.class_id).count()

    @property
    def total_study_time(self):
        total = db.session.query(
            db.func.coalesce(db.func.sum(StudySession.duration_minutes), 0)
        ).filter_by(class_id=self.class_id).scalar()
        return f"{total} min"

class ClassExpectedGrade(db.Model):
    __tablename__ = "class_expected_grades"

    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.class_id"), nullable=False)
    expected_grade = db.Column(db.Numeric, nullable=False)
    recorded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    class_ = db.relationship("Class", back_populates="expected_grades")
