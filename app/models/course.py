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

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
