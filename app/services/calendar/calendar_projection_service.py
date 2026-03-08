"""
services/calendar/calendar_projection_service.py

Fetches raw domain data and expands it into lifecycle projection objects.
This is the most data-intensive service in the calendar system.

A "projection" is an intermediate dict — NOT yet a CalendarEvent.
It carries the raw timestamp, the entity it came from, its lifecycle type,
and the data the factory needs to build the final CalendarEvent.

One DB row can produce multiple projections (lifecycle expansion).
An assignment can produce: assignment_created, assignment_due, assignment_finished.
A session can produce:    session_scheduled, session_active, session_completed, session_cancelled.

What it must NEVER do:
  - Return CalendarEvent objects (that's the factory's job)
  - Apply filters
  - Convert timezones (delegates to time_service)
"""

from datetime import datetime, timezone
from sqlalchemy import or_

from app.models.assignment import Assignment
from app.models.study_session import StudySession
from app.models.course import Class
from app.models.user import UserAssignmentTypeColor


def fetch_range(user_id: int, start_utc: datetime, end_utc: datetime) -> list:
    """
    Fetch raw domain data and expand into lifecycle projection dicts.

    Args:
        user_id:   authenticated user
        start_utc: range start as UTC-aware datetime
        end_utc:   range end   as UTC-aware datetime

    Returns:
        List of projection dicts — one per lifecycle event to display.
    """
    user_colors = _fetch_user_colors(user_id)

    projections = []
    projections.extend(_fetch_assignment_projections(user_id, start_utc, end_utc, user_colors))
    projections.extend(_fetch_session_projections(user_id, start_utc, end_utc, user_colors))
    # Phase 1+: add class projections here when needed
    # projections.extend(_fetch_class_projections(user_id, start_utc, end_utc))

    return projections


# ─────────────────────────────────────────────────────────────
# USER COLOR LOOKUP
# ─────────────────────────────────────────────────────────────

def _fetch_user_colors(user_id: int) -> dict:
    """Fetch the user's custom type-to-color mapping."""
    rows = UserAssignmentTypeColor.query.filter_by(user_id=user_id).all()
    return {row.assignment_type: row.color for row in rows}


# ─────────────────────────────────────────────────────────────
# ASSIGNMENT LIFECYCLE EXPANSION
# ─────────────────────────────────────────────────────────────

def _fetch_assignment_projections(
    user_id: int,
    start_utc: datetime,
    end_utc: datetime,
    user_colors: dict
) -> list:
    """
    Query assignments and expand into lifecycle projection records.
    Generates up to 3 projections per assignment: created, due, finished.
    """
    projections = []

    assignments = (
        Assignment.query
        .join(Class, Assignment.class_id == Class.class_id)
        .filter(
            Assignment.user_id == user_id,
            Assignment.show_on_calendar == True,
            or_(
                Assignment.due_at.between(start_utc, end_utc),
                Assignment.created_at.between(start_utc, end_utc),
                Assignment.finished_at.between(start_utc, end_utc),
            )
        )
        .all()
    )

    for assignment in assignments:
        class_      = assignment.class_
        user_color  = user_colors.get(assignment.assignment_type)

        base_metadata = {
            "class_name":      class_.class_name if class_ else None,
            "class_color":     class_.color      if class_ else None,
            "class_id":        assignment.class_id,
            "assignment_type": assignment.assignment_type,
            "is_completed":    assignment.is_completed,
            "has_due_date":    assignment.due_at is not None,
        }

        # ── assignment_due ────────────────────────────────────
        if assignment.due_at and start_utc <= assignment.due_at <= end_utc:
            projections.append({
                "entity_type":    "assignment",
                "lifecycle_type": "due",
                "source_id":      assignment.assignment_id,
                "title":          assignment.title,
                "start":          assignment.due_at,
                "end":            None,
                "all_day":        False,
                "user_color":     user_color,
                "metadata":       dict(base_metadata),
            })

        # ── assignment_created ────────────────────────────────
        if assignment.created_at and start_utc <= assignment.created_at <= end_utc:
            projections.append({
                "entity_type":    "assignment",
                "lifecycle_type": "created",
                "source_id":      assignment.assignment_id,
                "title":          f"{assignment.title} (added)",
                "start":          assignment.created_at,
                "end":            None,
                "all_day":        True,   # treat as all-day for cleaner display
                "user_color":     user_color,
                "metadata":       dict(base_metadata),
            })

        # ── assignment_finished ───────────────────────────────
        if assignment.finished_at and start_utc <= assignment.finished_at <= end_utc:
            projections.append({
                "entity_type":    "assignment",
                "lifecycle_type": "finished",
                "source_id":      assignment.assignment_id,
                "title":          f"{assignment.title} (done)",
                "start":          assignment.finished_at,
                "end":            None,
                "all_day":        True,
                "user_color":     user_color,
                "metadata":       dict(base_metadata),
            })

    return projections


# ─────────────────────────────────────────────────────────────
# SESSION LIFECYCLE EXPANSION
# ─────────────────────────────────────────────────────────────

def _fetch_session_projections(
    user_id: int,
    start_utc: datetime,
    end_utc: datetime,
    user_colors: dict
) -> list:
    """
    Query study sessions and expand into lifecycle projection records.
    Each session generates exactly ONE projection based on its current state.

    Priority order for display: cancelled > completed > active > scheduled
    The displayed lifecycle always reflects the session's actual current state,
    anchored to the most meaningful timestamp for that state.
    """
    projections = []

    sessions = (
        StudySession.query
        .join(Class, StudySession.class_id == Class.class_id)
        .filter(
            StudySession.user_id == user_id,
            StudySession.show_on_calendar == True,
            or_(
                StudySession.scheduled_start_at.between(start_utc, end_utc),
                StudySession.started_at.between(start_utc, end_utc),
                StudySession.cancelled_at.between(start_utc, end_utc),
            )
        )
        .all()
    )

    for session in sessions:
        projection = _build_session_projection(session, start_utc, end_utc, user_colors)
        if projection:
            projections.append(projection)

    return projections


def _build_session_projection(
    session,
    start_utc: datetime,
    end_utc: datetime,
    user_colors: dict
) -> dict | None:
    """
    Build one projection for a session, anchored to the right timestamp.

    Logic: find the lifecycle state, then find a timestamp in range.
    This correctly handles the case where a session was scheduled in October
    but cancelled in November — when viewing October, it shows as "cancelled"
    at its scheduled time.
    """
    class_     = session.class_
    user_color = user_colors.get(session.session_type)

    base_metadata = {
        "class_name":  class_.class_name if class_ else None,
        "class_color": class_.color      if class_ else None,
        "class_id":    session.class_id,
        "session_type": session.session_type,
        "is_completed": session.is_completed,
        "is_active":    session.is_active,
        "is_cancelled": session.cancelled_at is not None,
    }

    def make(lifecycle, start_ts, end_ts, title_suffix=""):
        return {
            "entity_type":    "study_session",
            "lifecycle_type": lifecycle,
            "source_id":      session.session_id,
            "title":          session.title + title_suffix,
            "start":          start_ts,
            "end":            end_ts,
            "all_day":        False,
            "user_color":     user_color,
            "metadata":       dict(base_metadata),
        }

    def in_range(ts):
        return ts is not None and start_utc <= ts <= end_utc

    # ── CANCELLED: show at scheduled time if in range, else at cancelled_at ──
    if session.cancelled_at:
        if in_range(session.scheduled_start_at):
            return make("cancelled", session.scheduled_start_at,
                        session.scheduled_end_at, " (cancelled)")
        if in_range(session.cancelled_at):
            return make("cancelled", session.cancelled_at, None, " (cancelled)")
        return None

    # ── COMPLETED: anchored at actual start ───────────────────
    if session.is_completed and in_range(session.started_at):
        return make("completed", session.started_at, session.session_end)

    # ── ACTIVE: anchored at actual start ─────────────────────
    if session.is_active and in_range(session.started_at):
        return make("active", session.started_at, None, " (active)")

    # ── SCHEDULED ────────────────────────────────────────────
    if in_range(session.scheduled_start_at):
        return make("scheduled", session.scheduled_start_at, session.scheduled_end_at)

    # ── STARTED WITHOUT SCHEDULE (edge case) ─────────────────
    if in_range(session.started_at):
        return make("active", session.started_at, None)

    return None


# ─────────────────────────────────────────────────────────────
# CLASS LIFECYCLE EXPANSION (Phase 1+ — scaffold ready)
# ─────────────────────────────────────────────────────────────

# def _fetch_class_projections(user_id, start_utc, end_utc):
#     """
#     Generates class_created and class_finished events.
#     Uncomment when class events are needed on the calendar.
#     """
#     projections = []
#     classes = Class.query.filter(
#         Class.user_id == user_id,
#         or_(
#             Class.created_at.between(start_utc, end_utc),
#             Class.finished_at.between(start_utc, end_utc),
#         )
#     ).all()
#     for cls in classes:
#         if cls.created_at and start_utc <= cls.created_at <= end_utc:
#             projections.append({...})
#         if cls.finished_at and start_utc <= cls.finished_at <= end_utc:
#             projections.append({...})
#     return projections