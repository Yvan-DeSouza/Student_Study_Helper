from app.extensions import db
from datetime import datetime, timezone
from sqlalchemy import func, text
from sqlalchemy.orm import validates
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql import select
from app.models.study_session import StudySession






class Assignment(db.Model):
    __tablename__ = "assignments"

    assignment_id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey("classes.class_id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)

    title = db.Column(db.Text, nullable=False)
    assignment_type = db.Column(db.Text, nullable=False)
    due_at = db.Column(db.DateTime(timezone=True), nullable=True)
    estimated_minutes = db.Column(db.Integer)
    is_graded = db.Column(db.Boolean, nullable=False, default=False, server_default=text('false'))
    ponderation = db.Column(db.Integer)
    is_completed = db.Column(db.Boolean, default=False, server_default=text('false'), nullable=False)
    grade = db.Column(db.Numeric(5, 2))
    expected_grade = db.Column(db.Numeric(5, 2))
    difficulty = db.Column(db.Integer)
    pass_grade = db.Column(db.Numeric(5, 2))
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now()
    )
    finished_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Relationships
    class_ = db.relationship("Class", back_populates="assignments")
    study_sessions = db.relationship(
        "StudySession", back_populates="assignment", cascade="all, delete-orphan"
    )
    expected_grades = db.relationship(
        "AssignmentExpectedGrade", back_populates="assignment", cascade="all, delete-orphan"
    )
    user = db.relationship("User")


    @hybrid_property
    def study_session_count(self):
        return len(self.study_sessions)

    @study_session_count.expression
    def study_session_count(cls):
        return (
            select(func.count(StudySession.session_id))
            .where(StudySession.assignment_id == cls.assignment_id)
            .scalar_subquery()
        )
    @hybrid_property
    def started_at(self):
        if not self.study_sessions:
            return None
        has_started = any(s.started_at is not None for s in self.study_sessions)
        if not has_started:
            return None
        return min(s.started_at for s in self.study_sessions if s.started_at is not None)
    
    @started_at.expression
    def started_at(assignment):
        return (
            select(func.min(StudySession.started_at))
            .where(StudySession.assignment_id == assignment.assignment_id)
            .scalar_subquery()
        )


    @hybrid_property
    def study_minutes(self):
        return sum(s.duration_minutes or 0 for s in self.study_sessions)

    @study_minutes.expression
    def study_minutes(cls):
        return (
            select(func.coalesce(func.sum(StudySession.duration_minutes), 0))
            .where(StudySession.assignment_id == cls.assignment_id)
            .scalar_subquery()
        )
    def to_analytics_dict(self, now: datetime = None) -> dict:
        """
        Canonical normalization for analytics layer.
        No ORM objects should escape past this boundary.

        Args:
            now: current timestamp for computing time-relative fields.
                 Defaults to current UTC time if not provided.
        """

        if now is None:
            now = datetime.now(timezone.utc)

        # -------------------------
        # days_until_due: integer days until due_at, or None if no due date.
        # Negative = overdue.
        # -------------------------
        days_until_due = (
            (self.due_at - now).days
            if self.due_at is not None
            else None
        )

        return {
            "assignment_id": self.assignment_id,
            "class_id": self.class_id,
            "class_type": self.class_.class_type if self.class_ else None,
            "assignment_type": self.assignment_type,

            "title": self.title,

            "due_at": self.due_at,
            "finished_at": self.finished_at,

            "is_completed": self.is_completed,
            "is_graded": self.is_graded,
            "grade": float(self.grade) if self.grade is not None else None,

            "ponderation": self.ponderation,
            "pass_grade": float(self.pass_grade) if self.pass_grade is not None else None,
            "difficulty": self.difficulty,
            "expected_grade": float(self.expected_grade) if self.expected_grade is not None else None,

            "estimated_minutes": self.estimated_minutes,

            # Computed / hybrid fields
            "study_minutes": self.study_minutes,
            "study_session_count": self.study_session_count,
            "started_at": self.started_at,
            "expected_started_at": (
                min(
                    (s.expected_started_at for s in self.study_sessions if s.expected_started_at),
                    default=None
                )
            ),


            # Time-relative computed field
            "days_until_due": days_until_due,
        }

    



    # ---------------------- VALIDATIONS ----------------------
    @validates('grade')
    def validate_grade(self, key, value):
        if value is not None:
            if not self.is_graded:
                raise ValueError("Cannot set grade if assignment is not marked as graded")
            if value < 0 or value > 100:
                raise ValueError("Grade must be between 0 and 100")
        return value

    @validates('expected_grade')
    def validate_expected_grade(self, key, value):
        if value is not None:
            if not self.is_graded:
                raise ValueError("Cannot set expected grade if assignment is not marked as graded")
            if value < 0 or value > 100:
                raise ValueError("Expected grade must be between 0 and 100")
        return value

    @validates('finished_at')
    def validate_finished_at(self, key, value):
        if value is not None and not self.is_completed:
            raise ValueError("Cannot set finished_at if assignment is not completed")
        return value

    # ---------------------- METHODS ----------------------
    def mark_as_graded(self, grade_value, finished_at=None):
        """Marks the assignment as graded, completed, and sets finished_at."""
        if grade_value < 0 or grade_value > 100:
            raise ValueError("Grade must be between 0 and 100")
        self.grade = grade_value
        self.is_graded = True
        self.is_completed = True
        self.finished_at = finished_at or datetime.now(timezone.utc)

    def record_expected_grade(self, value):
        """Creates a record of expected grade change and updates the current expected_grade."""
        if value < 0 or value > 100:
            raise ValueError("Expected grade must be between 0 and 100")
        self.expected_grade = value
        record = AssignmentExpectedGrade(
            assignment_id=self.assignment_id,
            user_id=self.user_id,
            expected_grade=value
        )
        db.session.add(record)


class AssignmentExpectedGrade(db.Model):
    __tablename__ = "assignment_expected_grades"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignments.assignment_id"), nullable=False)
    expected_grade = db.Column(db.Numeric(5, 2), nullable=False)
    recorded_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    assignment = db.relationship("Assignment", back_populates="expected_grades")
    user = db.relationship("User")

    def __repr__(self):
        return f"<AssignmentExpectedGrade assignment_id={self.assignment_id} value={self.expected_grade}>"
