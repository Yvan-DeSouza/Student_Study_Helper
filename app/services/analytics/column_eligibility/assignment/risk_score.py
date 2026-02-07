from dataclasses import dataclass
from typing import Tuple, Optional
from ..base import EligibilityResult, eligible_result, blocked_result
from ..user_stats import UserStats


@dataclass(frozen=True)
class RiskScoreReq:
    min_graded_assignments: int = 5
    min_days_since_earliest_graded: int = 14


def check_risk_score_user_eligibility(
    stats: UserStats,
    req: RiskScoreReq = RiskScoreReq(),
) -> EligibilityResult:
    missing = []
    reasons = []

    if stats.graded_assignments < req.min_graded_assignments:
        missing.append("graded_assignments")
        reasons.append({
            "metric": "graded_assignments",
            "current": stats.graded_assignments,
            "required": req.min_graded_assignments,
        })

    if (
        stats.days_since_earliest_graded is None
        or stats.days_since_earliest_graded < req.min_days_since_earliest_graded
    ):
        missing.append("time_span")
        reasons.append({
            "metric": "days_since_earliest_graded",
            "current": stats.days_since_earliest_graded,
            "required": req.min_days_since_earliest_graded,
        })

    if missing:
        return blocked_result(
            missing_requirements=missing,
            blocking_reasons=reasons,
            unlock_hint="Increase graded history over time.",
        )

    return eligible_result()


def check_risk_score_assignment_eligibility(assignment: dict) -> Tuple[bool, Optional[dict]]:
    """
    Returns (eligible, reason_dict)
    If not eligible, reason_dict contains explanation
    """
    if assignment.get("due_at") is None:
        return False, {
            "message": "Risk score requires a due date",
            "blocking_reasons": [{
                "metric": "due_date",
                "current": "None",
                "required": "Set"
            }]
        }
    
    if assignment.get("is_completed", False):
        return False, {
            "message": "Risk score only applies to uncompleted assignments",
            "blocking_reasons": [{
                "metric": "completion_status",
                "current": "Completed",
                "required": "Uncompleted"
            }]
        }
    
    return True, None