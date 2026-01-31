from dataclasses import dataclass

from ..base import EligibilityResult, eligible_result, blocked_result
from ..user_stats import UserStats


@dataclass(frozen=True)
class VolatilityReq:
    min_graded_assignments: int = 8
    min_assignment_types: int = 2


def check_volatility_user_eligibility(
    stats: UserStats,
) -> EligibilityResult:
    missing = []
    reasons = []

    if stats.graded_assignments < 8:
        missing.append("graded_assignments")
        reasons.append("Volatility requires at least 8 graded assignments.")

    if stats.distinct_assignment_types < 2:
        missing.append("assignment_types")
        reasons.append("Volatility requires multiple assignment types.")

    if missing:
        return blocked_result(
            missing_requirements=missing,
            blocking_reasons=reasons,
            unlock_hint="Accumulate more graded work across assignment types.",
        )

    return eligible_result()


def check_volatility_assignment_eligibility(
    assignment: dict,
    same_type_history_count: int,
) -> bool:
    return same_type_history_count >= 3
