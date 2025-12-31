from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from datetime import datetime, timezone
from sqlalchemy import text, func
class User(UserMixin, db.Model):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.Text, unique=True, nullable=False)
    email = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)
    user_type = db.Column(db.Text, nullable=False, default ='student', server_default=text("'student'"))

    preferences = db.relationship(
        "UserPreferences",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    classes = db.relationship("Class", back_populates="user", cascade="all, delete-orphan")

    class_type_colors = db.relationship('UserClassTypeColor', back_populates="user", cascade="all, delete-orphan")
    assignment_type_colors = db.relationship('UserAssignmentTypeColor', back_populates="user", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def get_id(self):
        return str(self.user_id)


class UserPreferences(db.Model):
    __tablename__ = "user_preferences"

    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), primary_key=True)
    theme = db.Column(db.Text, default='system')
    default_upcoming_deadlines_count = db.Column(db.Integer, default=3)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    user = db.relationship("User", back_populates="preferences")








# ================= USER CLASS-TYPE COLORS =================
class UserClassTypeColor(db.Model):
    __tablename__ = "user_class_type_colors"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    class_type = db.Column(db.Text, nullable=False)
    color = db.Column(db.Text, nullable=False, default="#4f46e5")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    user = db.relationship("User", back_populates="class_type_colors")

    __table_args__ = (
        db.UniqueConstraint("user_id", "class_type", name="uq_user_class_type"),
    )



# ================= USER ASSIGNMENT-TYPE COLORS =================
class UserAssignmentTypeColor(db.Model):
    __tablename__ = "user_assignment_type_colors"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    assignment_type = db.Column(db.Text, nullable=False)
    color = db.Column(db.Text, nullable=False, default="#4f46e5")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    user = db.relationship("User", back_populates="assignment_type_colors")

    __table_args__ = (
        db.UniqueConstraint("user_id", "assignment_type", name="uq_user_class_type"),
    )


# ================= CLASS VIEW PREFERENCES =================
class ClassViewPreferences(db.Model):
    __tablename__ = "class_view_preferences"

    class_preference_id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )

    page_name = db.Column(
        db.Text,
        nullable=False
    )

    sort_by = db.Column(
        db.Text,
        nullable=False,
        default="name_asc",
        server_default="name_asc"
    )

    status_filter = db.Column(
        db.Text,
        nullable=False,
        default="all",
        server_default="all"
    )

    filter_importance_high = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
        server_default="true"
    )

    filter_importance_medium = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
        server_default="true"
    )

    filter_importance_low = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
        server_default="true"
    )

    filter_class_types = db.Column(
        db.JSON,
        nullable=False,
        default=dict,
        server_default="{}"
    )

    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    __table_args__ = (
        db.UniqueConstraint("user_id", "page_name"),
    )

    user = db.relationship("User", backref="class_view_preferences")



class AssignmentViewPreferences(db.Model):
    __tablename__ = "assignment_view_preferences"

    assignment_preference_id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    due_status_filter = db.Column(
        db.Text,
        nullable=False,
        default="all",
        server_default="all"
    )

    completion_filter = db.Column(
        db.Text,
        nullable=False,
        default="all",
        server_default="all"
    )

    graded_filter = db.Column(
        db.Text,
        nullable=False,
        default="all",
        server_default="all"
    )

    created_filter = db.Column(
        db.Text,
        nullable=False,
        default="all",
        server_default="all"
    )

    filter_assignment_types = db.Column(
        db.JSON,
        nullable=False,
        default=dict,
        server_default="{}"
    )

    sort_by = db.Column(
        db.Text,
        nullable=False,
        default="name_asc",
        server_default="name_asc"
    )

    table_layout = db.Column(
        db.Text,
        nullable=False,
        default="per_class",
        server_default="per_class"
    )

    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    user = db.relationship("User", backref=db.backref(
        "assignment_view_preferences",
        uselist=False,
        cascade="all, delete-orphan"
    ))

