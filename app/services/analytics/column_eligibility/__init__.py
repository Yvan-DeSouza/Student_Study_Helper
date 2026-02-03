"""

Orchestrates USER-LEVEL eligibility for all advanced columns.
This is the only entry point the route needs.

Rules:
  - Computes UserStats exactly once.
  - Calls each advanced column's user eligibility check.
  - Returns Dict[column_key, EligibilityResult].
  - Does NOT run assignment-level checks (that's the row builder's job).
"""

from typing import Dict, List
from datetime import datetime

from app.services.analytics.column_eligibility.base import EligibilityResult
from app.services.analytics.column_eligibility.user_stats import (
    UserStats,
    compute_user_stats,
)

# Each advanced column's USER eligibility check
from app.services.analytics.column_eligibility.assignment.risk_score import (
    check_risk_score_user_eligibility,
)
from app.services.analytics.column_eligibility.assignment.effort_efficiency import (
    check_effort_efficiency_user_eligibility,
)
from app.services.analytics.column_eligibility.assignment.volatility import (
    check_volatility_user_eligibility,
)
from app.services.analytics.column_eligibility.assignment.deadline_sensitivity import (
    check_deadline_sensitivity_user_eligibility,
)
from app.services.analytics.column_eligibility.assignment.predictability_confidence import (
    check_predictability_confidence_user_eligibility,
)


def compute_all_eligibility(
    *,
    assignments: List[dict],
    now: datetime,
) -> Dict[str, EligibilityResult]:
    """
    Runs user-level eligibility for every advanced column.

    Input:
        assignments — the full list of assignment dicts for this user
                      (already normalized via to_analytics_dict)
        now         — current timestamp

    Output:
        { column_key: EligibilityResult }

    Only advanced columns that require_eligibility appear here.
    Simple / core / computed columns are never checked.
    """

    # -------------------------
    # Step 1: aggregate stats once
    # -------------------------
    stats: UserStats = compute_user_stats(assignments, now)

    # -------------------------
    # Step 2: run each user check
    # -------------------------
    results: Dict[str, EligibilityResult] = {}

    # --- risk_score ---
    # signature: (stats, req=default)
    results["risk_score"] = check_risk_score_user_eligibility(stats)

    # --- effort_efficiency ---
    # signature: (stats, assignments, req=default)
    # This one is special — it needs the raw assignment list to count
    # assignments_with_expected_minutes (not a UserStats field).
    results["effort_efficiency"] = check_effort_efficiency_user_eligibility(
        stats, assignments
    )

    # --- volatility ---
    # signature: (stats, req=default)
    results["volatility"] = check_volatility_user_eligibility(stats)

    # --- deadline_sensitivity ---
    # signature: (stats, req=default)
    results["deadline_sensitivity"] = check_deadline_sensitivity_user_eligibility(stats)

    # --- predictability_confidence ---
    # signature: (stats, req=default)
    results["predictability_confidence"] = check_predictability_confidence_user_eligibility(stats)

    return results