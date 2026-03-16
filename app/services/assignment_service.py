"""
app/services/assignment_service.py

Business-logic wrapper for assignment operations called by the calendar.

The calendar never updates the assignments table directly —
it delegates through this service, which owns all validation.

Functions exposed to calendar_update_service:
    update_due_date(assignment_id, new_due_at_utc, user_id)
"""

from datetime import datetime, timezone

from app.extensions import db
from app.models.assignment import Assignment


def update_due_date(assignment_id: int, new_due_at_utc: datetime, user_id: int) -> Assignment:
    """
    Update an assignment's due date.

    Rules:
      - Assignment must belong to user_id.
      - Assignment must not already be completed.
      - new_due_at_utc must be a UTC-aware datetime.

    Args:
        assignment_id:  PK of the assignment to update
        new_due_at_utc: New due date/time (UTC-aware datetime)
        user_id:        Authenticated user

    Returns:
        The updated Assignment ORM object (still in session).

    Raises:
        LookupError:    Assignment not found or doesn't belong to user.
        PermissionError: Assignment is already completed.
        ValueError:     new_due_at_utc is not a valid UTC datetime.
    """
    assignment = Assignment.query.filter_by(
        assignment_id=assignment_id,
        user_id=user_id,
    ).first()

    if not assignment:
        raise LookupError(f"Assignment {assignment_id} not found for user {user_id}")

    if assignment.is_completed:
        raise PermissionError(
            f"Assignment {assignment_id} is already completed and cannot be rescheduled"
        )

    # Ensure timezone awareness
    if new_due_at_utc.tzinfo is None:
        new_due_at_utc = new_due_at_utc.replace(tzinfo=timezone.utc)

    assignment.due_at = new_due_at_utc
    db.session.commit()

    return assignment