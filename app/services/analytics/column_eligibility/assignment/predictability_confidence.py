"""
User-level eligibility only.

predictability_confidence is a META column — it measures confidence in
the reliability of other analytics. It is not assignment-applicability-based.

Laws it must never break:
    ✔  User eligibility  → yes (gates the column)
    ✘  Assignment eligibility → does NOT exist for this column
"""

from dataclasses import dataclass
from ..base import EligibilityResult, eligible_result, blocked_result
from ..user_stats import UserStats


@dataclass(frozen=True)
class PredictabilityConfidenceReq:
    min_graded_assignments: int = 5


def check_predictability_confidence_user_eligibility(
    stats: UserStats,
    req: PredictabilityConfidenceReq = PredictabilityConfidenceReq(),
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

    if missing:
        return blocked_result(
            missing_requirements=missing,
            blocking_reasons=reasons,
            unlock_hint="Accumulate more graded assignments.",
        )

    return eligible_result()