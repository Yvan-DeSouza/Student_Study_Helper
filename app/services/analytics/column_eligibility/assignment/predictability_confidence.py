
from dataclasses import dataclass
from datetime import datetime

from ..base import EligibilityResult, eligible_result, blocked_result
from ..user_stats import UserStats


@dataclass(frozen=True)
class DeadlineSensitivityReq:
    min_incomplete_assignments_with_due_date: int = 3
    min_graded_assignments: int = 5
    min_days_span: int = 14


def check_deadline_sensitivity_user_eligibility(
    stats: UserStats,
) -> EligibilityResult:
    missing = []
    reasons = []

    if stats.assignments_with_due_date < 3:
        missing.append("due_dates")
        reasons.append("Deadline sensitivity requires assignments with due dates.")

    if stats.graded_assignments < 5:
        missing.append("graded_assignments")
        reasons.append("At least 5 graded assignments are required.")

    if (
        stats.days_since_earliest_graded is None
        or stats.days_since_earliest_graded < 14
    ):
        missing.append("time_span")
        reasons.append("At least 14 days of history are required.")

    if missing:
        return blocked_result(
            missing_requirements=missing,
            blocking_reasons=reasons,
            unlock_hint="Complete more graded assignments with deadlines.",
        )

    return eligible_result()


def check_deadline_sensitivity_assignment_eligibility(
    assignment: dict,
    now: datetime,
) -> bool:
    due = assignment.get("due_at")
    if due is None:
        return False

    days_until_due = (due - now).days
    return days_until_due <= 21
