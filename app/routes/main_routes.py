from flask import Blueprint, render_template, current_app
from flask_login import current_user, login_required
from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession

main = Blueprint("main", __name__)

@main.route("/main")
@login_required
def home():
    active_session = StudySession.query.filter_by(
        user_id=current_user.user_id,
        session_end=None
    ).first()
    classes = Class.query.filter_by(user_id=current_user.user_id).all()
    assignments = Assignment.query.join(Class).filter(Class.user_id == current_user.user_id).all()
    return render_template("home.html", user=current_user, classes=classes, assignments=assignments, active_session=active_session)
