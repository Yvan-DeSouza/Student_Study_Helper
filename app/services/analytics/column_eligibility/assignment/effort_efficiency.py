from dataclasses import dataclass
from ..base import EligibilityResult, eligible_result, blocked_result
from ..user_stats import UserStats


@dataclass(frozen=True)
class EffortEfficiencyReq:
    min_completed_assignments: int = 5
    min_assignments_with_expected: int = 3


def check_effort_efficiency_user_eligibility(
    stats: UserStats,
    assignments: list[dict],
    req: EffortEfficiencyReq = EffortEfficiencyReq(),
) -> EligibilityResult:
    with_expected = sum(
        1 for a in assignments if a.get("estimated_minutes") is not None
    )

    missing = []
    reasons = []

    if stats.completed_assignments < req.min_completed_assignments:
        missing.append("completed_assignments")
        reasons.append({
            "metric": "completed_assignments",
            "current": stats.completed_assignments,
            "required": req.min_completed_assignments,
        })

    if with_expected < req.min_assignments_with_expected:
        missing.append("expected_minutes")
        reasons.append({
            "metric": "assignments_with_expected",
            "current": with_expected,
            "required": req.min_assignments_with_expected,
        })

    if missing:
        return blocked_result(
            missing_requirements=missing,
            blocking_reasons=reasons,
            unlock_hint="Complete assignments with time estimates.",
        )

    return eligible_result()


def check_effort_efficiency_assignment_eligibility(
    assignment: dict,
    has_estimation_fallback: bool,
) -> bool:
    if assignment.get("study_minutes") is None:
        return False

    if assignment.get("estimated_minutes") is not None:
        return True

    return has_estimation_fallback
