from dataclasses import dataclass
from typing import Tuple, Optional
from ..base import EligibilityResult, eligible_result, blocked_result
from ..user_stats import UserStats


@dataclass(frozen=True)
class VolatilityReq:
    min_graded_assignments: int = 8
    min_assignment_types: int = 2
    min_same_type_history: int = 3


def check_volatility_user_eligibility(
    stats: UserStats,
    req: VolatilityReq = VolatilityReq(),
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

    if stats.distinct_assignment_types < req.min_assignment_types:
        missing.append("assignment_types")
        reasons.append({
            "metric": "distinct_assignment_types",
            "current": stats.distinct_assignment_types,
            "required": req.min_assignment_types,
        })

    if missing:
        return blocked_result(
            missing_requirements=missing,
            blocking_reasons=reasons,
            unlock_hint="Build grade history across assignment types.",
        )

    return eligible_result()


def check_volatility_assignment_eligibility(
    assignment: dict,
    same_type_history_count: int,
    req: VolatilityReq = VolatilityReq(),
) -> Tuple[bool, Optional[dict]]:
    """
    Returns (eligible, reason_dict)
    """
    if same_type_history_count < req.min_same_type_history:
        return False, {
            "message": f"Volatility requires {req.min_same_type_history} similar graded assignments",
            "blocking_reasons": [{
                "metric": "same_type_graded_assignments",
                "current": same_type_history_count,
                "required": req.min_same_type_history
            }]
        }
    
    return True, None