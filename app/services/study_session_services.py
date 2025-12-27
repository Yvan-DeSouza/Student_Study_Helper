# app/services/study_session_service.py
from app.models.study_session import StudySession
from datetime import datetime, timezone
from sqlalchemy import and_


def get_active_session(user_id: int) -> StudySession | None:
    """
    Returns the currently active session for the given user.
    """
    return StudySession.query.filter_by(
        user_id=user_id,
        is_active=True
    ).filter(
        StudySession.cancelled_at.is_(None)
    ).first()


def get_due_scheduled_session(user_id: int) -> StudySession | None:
    """
    Returns the next scheduled session that should have started
    but has not been started yet (is_active=False), and is not
    completed or cancelled.
    """
    now = datetime.now(timezone.utc)

    return StudySession.query.filter_by(
        user_id=user_id,
        is_active=False,
        is_completed=False
    ).filter(
        StudySession.cancelled_at.is_(None),
        StudySession.expected_started_at <= now
    ).order_by(StudySession.expected_started_at.asc()).first()


def has_active_session(user_id: int) -> bool:
    """
    Returns True if the user currently has an active session.
    """
    return get_active_session(user_id) is not None



def check_session_collision(user_id: int) -> dict | None:
    """
    Checks if the user has a session collision:
    - There is an active session (session 1)
    - There is a scheduled session due to start (session 2)

    Returns:
        None if no collision exists.

        Otherwise, a dict:
        {
            "active_session": StudySession,
            "due_scheduled_session": StudySession
        }
    """
    active_session = get_active_session(user_id)
    due_scheduled_session = get_due_scheduled_session(user_id)

    if active_session and due_scheduled_session:
        return {
            "active_session": active_session,
            "due_scheduled_session": due_scheduled_session
        }

    return None
