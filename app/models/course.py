from app.extensions import db
from datetime import datetime, timezone
from sqlalchemy import select, func, text
from app.models.study_session import StudySession
from app.models.assignment import Assignment
from sqlalchemy.ext.hybrid import hybrid_property

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
    finished_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    user = db.relationship("User", back_populates="classes")
    assignments = db.relationship("Assignment", back_populates="class_", cascade="all, delete-orphan")
    study_sessions = db.relationship("StudySession", back_populates="class_", cascade="all, delete-orphan")
    expected_grades = db.relationship("ClassExpectedGrade", back_populates="class_", cascade="all, delete-orphan")

    @hybrid_property
    def total_assignments(self):
        return len(self.assignments)

    @total_assignments.expression
    def total_assignments(cls):
        return (
            select(func.count(Assignment.assignment_id))
            .where(Assignment.class_id == cls.class_id)
            .scalar_subquery()
        )

    @hybrid_property
    def completed_assignments(self):
        return sum(1 for a in self.assignments if a.is_completed)

    @completed_assignments.expression
    def completed_assignments(cls):
        return (
            select(func.count(Assignment.assignment_id))
            .where(
                (Assignment.class_id == cls.class_id) &
                (Assignment.is_completed == True)
            )
            .scalar_subquery()
        )


    @hybrid_property
    def total_study_sessions(self):
        return StudySession.query.filter_by(class_id=self.class_id).count()

    @total_study_sessions.expression
    def total_study_sessions(cls):
        return (
            select(func.count(StudySession.session_id))
            .where(
                (StudySession.class_id == cls.class_id)
            )
            .scalar_subquery()
        )
    
    @hybrid_property
    def total_study_time(self):
        return sum(s.duration_minutes or 0 for s in self.study_sessions)

    @total_study_time.expression
    def total_study_time(cls):
        return (
            select(func.coalesce(func.sum(StudySession.duration_minutes), 0))
            .where(StudySession.class_id == cls.class_id)
            .scalar_subquery()
        )

class ClassExpectedGrade(db.Model):
    __tablename__ = "class_expected_grades"

    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.class_id"), nullable=False)
    expected_grade = db.Column(db.Numeric, nullable=False)
    recorded_at = db.Column(db.DateTime(timezone = True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    class_ = db.relationship("Class", back_populates="expected_grades")
