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
    assignments_view = db.Column(db.Text, default='single_table')
    show_completed_assignments = db.Column(db.Boolean, default=True, nullable=False)
    default_upcoming_deadlines_count = db.Column(db.Integer, default=3)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    user = db.relationship("User", back_populates="preferences")

