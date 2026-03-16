"""
app/services/study_session_service.py

Business-logic wrapper for study session operations called by the calendar.

Functions exposed to calendar_update_service:
    update_schedule(session_id, new_start_utc, new_end_utc, user_id)
"""

from datetime import datetime, timezone

from app.extensions import db
from app.models.study_session import StudySession


def update_schedule(
    session_id: int,
    new_start_utc: datetime,
    new_end_utc: datetime | None,
    user_id: int,
) -> StudySession:
    """
    Reschedule a study session's scheduled_start_at and scheduled_end_at.

    Rules:
      - Session must belong to user_id.
      - Session must NOT be completed, active, or cancelled.
      - new_end_utc must be after new_start_utc (if provided).
      - rescheduled_count is incremented on every successful reschedule.

    Args:
        session_id:    PK of the study session
        new_start_utc: New scheduled start (UTC-aware datetime)
        new_end_utc:   New scheduled end  (UTC-aware datetime or None)
        user_id:       Authenticated user

    Returns:
        The updated StudySession ORM object.

    Raises:
        LookupError:    Session not found or doesn't belong to user.
        PermissionError: Session is not in a schedulable state.
        ValueError:     new_end_utc is not after new_start_utc.
    """
    session = StudySession.query.filter_by(
        session_id=session_id,
        user_id=user_id,
    ).first()

    if not session:
        raise LookupError(f"StudySession {session_id} not found for user {user_id}")

    if session.is_completed:
        raise PermissionError(f"Session {session_id} is already completed")

    if session.is_active:
        raise PermissionError(f"Session {session_id} is currently active")

    if session.cancelled_at is not None:
        raise PermissionError(f"Session {session_id} has been cancelled")

    # Ensure timezone awareness
    def _ensure_utc(dt):
        if dt is None:
            return None
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt

    new_start_utc = _ensure_utc(new_start_utc)
    new_end_utc   = _ensure_utc(new_end_utc)

    if new_end_utc and new_end_utc <= new_start_utc:
        raise ValueError("new_end_utc must be after new_start_utc")

    session.scheduled_start_at = new_start_utc
    session.scheduled_end_at   = new_end_utc
    session.rescheduled_count  = (session.rescheduled_count or 0) + 1

    db.session.commit()

    return session