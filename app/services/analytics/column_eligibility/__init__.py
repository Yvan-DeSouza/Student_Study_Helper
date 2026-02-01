# app/services/analytics/column_eligibility/__init__.py

from datetime import datetime
from typing import Dict, List

from app.services.columns import COLUMN_REGISTRY
from app.services.analytics.column_eligibility.base import EligibilityResult, eligible_result
from app.services.analytics.column_eligibility.user_stats import compute_user_stats

# Import per-column eligibility checks
from app.services.analytics.column_eligibility.assignment.deadline_sensitivity import (
    check_deadline_sensitivity_user_eligibility,
)
from app.services.analytics.column_eligibility.assignment.effort_efficiency import (
    check_effort_efficiency_user_eligibility,
)
from app.services.analytics.column_eligibility.assignment.risk_score import (
    check_risk_score_user_eligibility,
)
from app.services.analytics.column_eligibility.assignment.volatility import (
    check_volatility_user_eligibility,
)
# predictability_confidence can be added later


# -------------------------
# User-level eligibility map
# -------------------------

USER_ELIGIBILITY_CHECKS = {
    "deadline_sensitivity": check_deadline_sensitivity_user_eligibility,
    "effort_efficiency": check_effort_efficiency_user_eligibility,
    "risk_score": check_risk_score_user_eligibility,
    "volatility": check_volatility_user_eligibility,
}


# -------------------------
# Orchestrator
# -------------------------

def compute_all_eligibility(
    *,
    assignments: List[dict],
    now: datetime,
) -> Dict[str, EligibilityResult]:
    """
    Computes USER-LEVEL eligibility for all columns that require it.

    Returns:
        Dict[column_key -> EligibilityResult]
    """

    results: Dict[str, EligibilityResult] = {}

    # Compute user stats ONCE
    stats = compute_user_stats(assignments, now)

    for key, col in COLUMN_REGISTRY.items():
        if not col.requires_eligibility:
            continue

        check_fn = USER_ELIGIBILITY_CHECKS.get(key)

        if check_fn is None:
            # Fail-safe: column exists but no rule yet
            results[key] = eligible_result()
            continue

        # Some checks need assignments, others don't
        try:
            if key == "effort_efficiency":
                result = check_fn(stats, assignments)
            else:
                result = check_fn(stats)
        except Exception:
            # Eligibility must NEVER crash the system
            result = eligible_result()

        results[key] = result

    return results
