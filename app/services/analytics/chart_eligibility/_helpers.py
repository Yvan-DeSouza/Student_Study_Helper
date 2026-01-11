from datetime import datetime, timezone
from app.extensions import db
from app.models.assignment import Assignment
from app.models.course import Class

def weeks_since(date):
    if not date:
        return 0
    return (datetime.now(timezone.utc) - date).days // 7

def earliest_graded_assignment_date(user_id):
    result = (
        db.session.query(Assignment.finished_at)
        .join(Class)
        .filter(
            Class.user_id == user_id,
            Assignment.grade.isnot(None),
            Assignment.finished_at.isnot(None)
        )
        .order_by(Assignment.finished_at.asc())
        .first()
    )
    return result[0] if result else None

# Helper to compute time since first graded assignment
def weeks_since_first_graded(first_date):
    if first_date is None:
        return 0
    now = datetime.now(timezone.utc)
    delta = now - first_date
    return delta.days // 7