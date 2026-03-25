"""
app/services/calendar/calendar_update_service.py

Handles the backend side of a drag-and-drop move operation.

Pipeline:
    parse event_id
    → confirm ownership
    → validate draggable (server-authoritative)
    → convert new_start local → UTC
    → delegate to domain service
    → re-build CalendarEvent from updated entity
    → return CalendarEvent dict

This service never queries the assignments or sessions tables directly —
it delegates to domain services that own those tables.
"""


from app.services.shared.time_service         import local_to_utc
from app.services.calendar.calendar_event_factory   import build
from app.services.calendar.calendar_permission_service import validate_draggable
from app.models.user          import UserAssignmentTypeColor


def move_event(
    event_id: str,
    new_start: str,
    new_end: str | None,
    timezone_str: str,
    user_id: int,
) -> dict:
    """
    Move a calendar event to a new start (and optionally end) time.

    Args:
        event_id:     Full CalendarEvent ID, e.g. "assignment_42_due"
        new_start:    Local ISO datetime string, e.g. "2026-01-24T09:00:00"
        new_end:      Local ISO datetime string or None
        timezone_str: IANA timezone string, e.g. "America/New_York"
        user_id:      Authenticated user

    Returns:
        Updated CalendarEvent dict (same shape as the API response).

    Raises:
        ValueError:     Malformed event_id or datetime.
        LookupError:    Entity not found or not owned by user.
        PermissionError: Event is not draggable.
    """
    # 1. Parse event_id
    entity_type, source_id, lifecycle_type = _parse_event_id(event_id)

    # 2. Convert local datetimes to UTC
    new_start_utc = local_to_utc(new_start, timezone_str)
    new_end_utc   = local_to_utc(new_end, timezone_str) if new_end else None

    # 3. Fetch entity + confirm ownership + validate draggable
    if entity_type == "assignment" and lifecycle_type == "due":
        return _move_assignment_due(
            source_id, new_start_utc, user_id
        )

    if entity_type == "study_session" and lifecycle_type == "scheduled":
        return _move_session_scheduled(
            source_id, new_start_utc, new_end_utc, user_id
        )

    raise ValueError(f"Event type '{entity_type}/{lifecycle_type}' is not movable")


# ─────────────────────────────────────────────────────────────
# DOMAIN DELEGATES
# ─────────────────────────────────────────────────────────────

def _move_assignment_due(assignment_id: int, new_due_at_utc, user_id: int) -> dict:
    from app.services.assignment_service import update_due_date

    assignment = update_due_date(assignment_id, new_due_at_utc, user_id)
    user_colors = _fetch_user_colors(user_id)

    # Build a projection from the updated entity
    cls        = assignment.class_
    projection = {
        "entity_type":    "assignment",
        "lifecycle_type": "due",
        "source_id":      assignment.assignment_id,
        "title":          assignment.title,
        "start":          assignment.due_at,
        "end":            None,
        "all_day":        False,
        "user_color":     user_colors.get(assignment.assignment_type),
        "metadata": {
            "class_name":      cls.class_name if cls else None,
            "class_color":     cls.color      if cls else None,
            "class_id":        assignment.class_id,
            "assignment_type": assignment.assignment_type,
            "is_completed":    assignment.is_completed,
            "has_due_date":    assignment.due_at is not None,
        },
    }

    event = build(projection)

    # Server-side permission re-check
    if not validate_draggable(event):
        raise PermissionError("Assignment due event is no longer draggable after update")

    event["draggable"] = True
    return event


def _move_session_scheduled(session_id: int, new_start_utc, new_end_utc, user_id: int) -> dict:
    from app.services.study_session_service import update_schedule

    session = update_schedule(session_id, new_start_utc, new_end_utc, user_id)
    user_colors = _fetch_user_colors(user_id)

    cls        = session.class_
    projection = {
        "entity_type":    "study_session",
        "lifecycle_type": "scheduled",
        "source_id":      session.session_id,
        "title":          session.title,
        "start":          session.scheduled_start_at,
        "end":            session.scheduled_end_at,
        "all_day":        False,
        "user_color":     user_colors.get(session.session_type),
        "metadata": {
            "class_name":   cls.class_name if cls else None,
            "class_color":  cls.color      if cls else None,
            "class_id":     session.class_id,
            "session_type": session.session_type,
            "is_completed": session.is_completed,
            "is_active":    session.is_active,
            "is_cancelled": session.cancelled_at is not None,
        },
    }

    event = build(projection)

    if not validate_draggable(event):
        raise PermissionError("Session scheduled event is no longer draggable after update")

    event["draggable"] = True
    return event


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def _parse_event_id(event_id: str):
    """
    Parse "assignment_42_due" or "study_session_7_scheduled" into
    (entity_type, source_id, lifecycle_type).
    """
    parts = event_id.split("_")
    if len(parts) < 3:
        raise ValueError(f"Invalid event_id format: {event_id!r}")

    # study_session has underscore in entity type name
    if parts[0] == "study" and parts[1] == "session":
        if len(parts) < 4:
            raise ValueError(f"Invalid study_session event_id: {event_id!r}")
        return "study_session", int(parts[2]), parts[3]

    return parts[0], int(parts[1]), parts[2]


def _fetch_user_colors(user_id: int) -> dict:
    rows = UserAssignmentTypeColor.query.filter_by(user_id=user_id).all()
    return {row.assignment_type: row.color for row in rows}