from ..base import eligible_result, blocked_result
from ..user_stats import UserStats

def check_predictability_confidence_user_eligibility(
    stats: UserStats,
):
    if stats.graded_assignments < 5:
        return blocked_result(
            missing_requirements=["graded_assignments"],
            blocking_reasons=[{
                "metric": "graded_assignments",
                "current": stats.graded_assignments,
                "required": 5,
            }],
            unlock_hint="Accumulate more graded assignments.",
        )

    return eligible_result()
