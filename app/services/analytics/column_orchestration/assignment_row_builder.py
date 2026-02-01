from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

from app.services.columns import COLUMN_REGISTRY
from app.services.analytics.column_orchestration.column_state_resolver import ColumnState
from app.services.analytics.column_eligibility.base import EligibilityResult

# Computation imports
from app.services.analytics.computation.risk import compute_assignment_risk_column
from app.services.analytics.computation.effort import compute_effort_efficiency
from app.services.analytics.computation.volatility import compute_volatility_column
from app.services.analytics.computation.deadline import compute_deadline_sensitivity_column
from app.services.analytics.computation.confidence import compute_predictability_confidence_column


COMPUTATION_MAP = {
    "risk_score": compute_assignment_risk_column,
    "effort_efficiency": compute_effort_efficiency,
    "volatility": compute_volatility_column,
    "deadline_sensitivity": compute_deadline_sensitivity_column,
    "predictability_confidence": compute_predictability_confidence_column,
}


# -------------------------
# Placeholders
# -------------------------

LOCKED_PLACEHOLDER = "—"
NOT_APPLICABLE = None


# -------------------------
# Row Builder
# -------------------------

def build_assignment_row(
    *,
    assignment: dict,
    all_assignments: List[dict],
    column_states: Dict[str, ColumnState],
    eligibility_results: Dict[str, EligibilityResult],
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Builds a single assignment row.

    - Only visible columns are included
    - Locked columns receive placeholders
    - Computation is called only when allowed
    """

    now = now or datetime.now(timezone.utc)

    row: Dict[str, Any] = {}

    for key, state in column_states.items():
        if not state.visible:
            continue

        col_def = COLUMN_REGISTRY[key]

        # -------------------------
        # Locked column
        # -------------------------
        if state.locked:
            row[key] = {
                "value": LOCKED_PLACEHOLDER,
                "locked": True,
                "reason": (
                    state.lock_reason.unlock_hint
                    if state.lock_reason else None
                ),
            }
            continue

        # -------------------------
        # Core / Simple columns
        # -------------------------
        if key in assignment:
            row[key] = {
                "value": assignment.get(key),
                "locked": False,
            }
            continue

        # -------------------------
        # Computed / Advanced columns
        # -------------------------
        compute_fn = COMPUTATION_MAP.get(key)

        if compute_fn is None:
            row[key] = {
                "value": NOT_APPLICABLE,
                "locked": False,
            }
            continue

        try:
            value = compute_fn(
                target_assignment=assignment,
                past_assignments=all_assignments,
                now=now,
            )

            if value is None:
                row[key] = {
                    "value": NOT_APPLICABLE,
                    "locked": False,
                }
            else:
                row[key] = {
                    "value": value,
                    "locked": False,
                }

        except Exception as e:
            # Hard fail safety: computation should never crash table
            row[key] = {
                "value": NOT_APPLICABLE,
                "locked": False,
                "error": str(e),
            }

    return row
