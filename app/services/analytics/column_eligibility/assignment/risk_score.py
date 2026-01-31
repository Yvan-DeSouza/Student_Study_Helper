
from dataclasses import dataclass
from datetime import datetime

from ..base import EligibilityResult, eligible_result, blocked_result
from ..user_stats import UserStats


@dataclass(frozen=True)
class RiskScoreReq:
    min_graded_assignments_total: int = 5
    min_days_since_earliest_graded: int = 14


def check_risk_score_user_eligibility(
    stats: UserStats,
) -> EligibilityResult:
    missing = []
    reasons = []

    if stats.graded_assignments < 5:
        missing.append("graded_assignments")
        reasons.append("At least 5 graded assignments are required.")

    if (
        stats.days_since_earliest_graded is None
        or stats.days_since_earliest_graded < 14
    ):
        missing.append("time_span")
        reasons.append("At least 14 days of grading history are required.")

    if missing:
        return blocked_result(
            missing_requirements=missing,
            blocking_reasons=reasons,
            unlock_hint="Complete more graded assignments over time.",
        )

    return eligible_result()


def check_risk_score_assignment_eligibility(assignment: dict) -> bool:
    return (
        assignment.get("due_at") is not None
        and not assignment.get("is_completed", False)
    )
