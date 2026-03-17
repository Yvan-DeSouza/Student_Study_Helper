"""
app/routes/calendar/calendar_page_routes.py

Serves the calendar HTML page. Passes template context needed for
server-side modal rendering (class dropdowns, active session flag).
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
    classes = (
        Class.query
        .filter_by(user_id=current_user.user_id)
        .order_by(Class.class_name)
        .all()
    )

    assignments = (
        Assignment.query
        .join(Class, Assignment.class_id == Class.class_id)
        .filter(Class.user_id == current_user.user_id)
        .filter(Assignment.is_completed == False)
        .order_by(Assignment.title)
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