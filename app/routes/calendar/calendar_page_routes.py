"""
app/routes/calendar/calendar_page_routes.py
Passes classes, assignments, and has_active_session so modals can be
rendered fully server-side (required by add_assignment.html Jinja loop).
"""
from flask import Blueprint, render_template
from flask_login import current_user, login_required

from app.models.course import Class
from app.models.assignment import Assignment
from app.models.study_session import StudySession

calendar = Blueprint("calendar", __name__)


@calendar.route("/calendar")
@login_required
def enter():
    classes = Class.query.filter_by(user_id=current_user.user_id).all()

    assignments = (
        Assignment.query
        .join(Class, Assignment.class_id == Class.class_id)
        .filter(Class.user_id == current_user.user_id)
        .all()
    )

    has_active_session = StudySession.query.filter_by(
        user_id=current_user.user_id,
        is_active=True,
    ).first() is not None

    return render_template(
        "calendar/calendar.html",
        user_timezone=current_user.timezone or "UTC",
        user_created_at=current_user.created_at.isoformat(),
        classes=classes,
        assignments=assignments,
        has_active_session=has_active_session,
    )