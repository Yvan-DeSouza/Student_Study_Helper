from flask import Blueprint, render_template, current_app
from flask_login import current_user, login_required
from app.models.course import Class
from app.models.assignment import Assignment

from datetime import datetime, timezone
from app.models.user import UserPreferences
main = Blueprint("main", __name__)

@main.route("/main")
@login_required
def home():


    classes = Class.query.filter_by(user_id=current_user.user_id).all()
    assignments = Assignment.query.join(Class).filter(
        Class.user_id == current_user.user_id
    ).all()
    prefs = UserPreferences.query.filter_by(user_id=current_user.user_id).first()
    deadline_count = prefs.default_upcoming_deadlines_count if prefs else 3

    return render_template(
        "home.html",
        now=datetime.now(timezone.utc),
        user=current_user,
        classes=classes,
        assignments=assignments,
        deadline_count=deadline_count
    )


@main.route("/upcoming-deadlines/partial")
@login_required
def upcoming_deadlines_partial():
    classes = Class.query.filter_by(user_id=current_user.user_id).all()
    assignments = Assignment.query.join(Class).filter(Class.user_id == current_user.user_id).all()
    prefs = UserPreferences.query.filter_by(user_id=current_user.user_id).first()
    deadline_count = prefs.default_upcoming_deadlines_count if prefs else 3
    return render_template('partials/upcoming_deadlines.html', assignments=assignments, deadline_count=deadline_count, page_id='main')

