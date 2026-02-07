from dataclasses import dataclass
from datetime import datetime
from typing import Tuple, Optional
from ..base import EligibilityResult, eligible_result, blocked_result
from ..user_stats import UserStats


@dataclass(frozen=True)
class DeadlineSensitivityReq:
    min_assignments_with_due_date: int = 3
    min_graded_assignments: int = 5
    min_days_span: int = 14
    max_days_until_due: int = 21


def check_deadline_sensitivity_user_eligibility(
    stats: UserStats,
    req: DeadlineSensitivityReq = DeadlineSensitivityReq(),
) -> EligibilityResult:
    missing = []
    reasons = []

    if stats.assignments_with_due_date < req.min_assignments_with_due_date:
        missing.append("due_dates")
        reasons.append({
            "metric": "assignments_with_due_date",
            "current": stats.assignments_with_due_date,
            "required": req.min_assignments_with_due_date,
        })

    if stats.graded_assignments < req.min_graded_assignments:
        missing.append("graded_assignments")
        reasons.append({
            "metric": "graded_assignments",
            "current": stats.graded_assignments,
            "required": req.min_graded_assignments,
        })

    if (
        stats.days_since_earliest_graded is None
        or stats.days_since_earliest_graded < req.min_days_span
    ):
        missing.append("time_span")
        reasons.append({
            "metric": "days_since_earliest_graded",
            "current": stats.days_since_earliest_graded,
            "required": req.min_days_span,
        })
    if missing:
        return blocked_result(
            missing_requirements=missing,
            blocking_reasons=reasons,
            unlock_hint="Accumulate graded assignments with deadlines over time.",
        )

    return eligible_result()


def check_deadline_sensitivity_assignment_eligibility(
    assignment: dict,
    now: datetime,
    req: DeadlineSensitivityReq = DeadlineSensitivityReq(),
) -> Tuple[bool, Optional[dict]]:
    """
    Returns (eligible, reason_dict)
    """
    due = assignment.get("due_at")

    if due is None:
        return False, {
            "message": "Deadline sensitivity requires a due date",
            "blocking_reasons": [{
                "metric": "due_date",
                "current": "None",
                "required": "Set"
            }]
        }

    days_until = (due - now).days
    if days_until > req.max_days_until_due:
        return False, {
            "message": f"Deadline sensitivity only applies within {req.max_days_until_due} days of deadline",
            "blocking_reasons": [{
                "metric": "days_until_due",
                "current": days_until,
                "required": f"≤ {req.max_days_until_due}"
            }]
        }

    return True, None