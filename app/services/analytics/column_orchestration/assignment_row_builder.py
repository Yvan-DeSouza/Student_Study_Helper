from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone

from app.services.analytics.column_orchestration.column_state_resolver import ColumnState
from app.services.analytics.column_eligibility.base import EligibilityResult
from app.services.analytics.computation.result import ComputationResult
from app.services.analytics.computation.expected import has_enough_data

# Assignment-level eligibility checks (each has its own signature)
from app.services.analytics.column_eligibility.assignment.risk_score import (
    check_risk_score_assignment_eligibility,
)
from app.services.analytics.column_eligibility.assignment.deadline_sensitivity import (
    check_deadline_sensitivity_assignment_eligibility,
)
from app.services.analytics.column_eligibility.assignment.effort_efficiency import (
    check_effort_efficiency_assignment_eligibility,
)
from app.services.analytics.column_eligibility.assignment.volatility import (
    check_volatility_assignment_eligibility,
)

# Computation adapters (uniform signature: target_assignment, past_assignments, now)
from app.services.analytics.computation.risk import compute_assignment_risk_column
from app.services.analytics.computation.effort import compute_effort_efficiency
from app.services.analytics.computation.volatility import compute_volatility_column
from app.services.analytics.computation.deadline import compute_deadline_sensitivity_column
from app.services.analytics.computation.confidence import compute_predictability_confidence_column


# Maps column_key → computation adapter.
# All adapters share: (*, target_assignment, past_assignments, now)
COMPUTATION_MAP = {
    "risk_score":                compute_assignment_risk_column,
    "effort_efficiency":         compute_effort_efficiency,
    "volatility":                compute_volatility_column,
    "deadline_sensitivity":      compute_deadline_sensitivity_column,
    "predictability_confidence": compute_predictability_confidence_column,
}


# -------------------------
# Placeholders
# -------------------------
LOCKED_PLACEHOLDER = "—"


# -------------------------
# Context builder
# -------------------------
def _compute_same_type_graded_count(
    target_assignment: dict,
    all_assignments: List[dict],
) -> int:
    """
    Count of OTHER assignments with the same assignment_type that are graded.
    Used by: volatility assignment eligibility.
    """
    target_type = target_assignment.get("assignment_type")
    target_id = target_assignment.get("assignment_id")
    return sum(
        1 for a in all_assignments
        if a.get("assignment_type") == target_type
        and a.get("assignment_id") != target_id
        and a.get("is_graded")
        and a.get("grade") is not None
    )


# -------------------------
# Assignment eligibility dispatch
# -------------------------
def _check_assignment_eligibility(
    *,
    key: str,
    assignment: dict,
    now: datetime,
    same_type_graded_count: int,
    has_estimation_fallback: bool,
) -> Tuple[Optional[bool], Optional[dict]]:
    """
    Dispatches the assignment-level eligibility check for `key`.

    Returns:
        (True, None)  → column applies, proceed to computation
        (False, reason_dict) → column does not apply, cell is locked with reason
        (None, None)  → column has no assignment eligibility check
    """

    if key == "risk_score":
        return check_risk_score_assignment_eligibility(assignment)

    elif key == "deadline_sensitivity":
        return check_deadline_sensitivity_assignment_eligibility(assignment, now)

    elif key == "effort_efficiency":
        return check_effort_efficiency_assignment_eligibility(assignment, has_estimation_fallback)

    elif key == "volatility":
        return check_volatility_assignment_eligibility(assignment, same_type_graded_count)

    else:
        # No assignment eligibility for this column
        return None, None


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
    context: dict = {}
) -> Dict[str, Any]:
    """
    Builds a single assignment row.

    - Only visible columns are included in the output.
    - Locked columns receive a placeholder + lock reason.
    - Computed columns are only executed when:
        (a) the column is not locked (user eligibility passed), AND
        (b) assignment eligibility passes (or doesn't exist for that column)
    - Core / Simple / Computed-simple columns are read directly from the dict.
    """

    now = now or datetime.now(timezone.utc)

    # -------------------------
    # Pre-compute context values (once per row, shared across columns)
    # -------------------------
    same_type_graded_count: int = _compute_same_type_graded_count(assignment, all_assignments)
    has_estimation_fallback: bool = has_enough_data(all_assignments)

    # -------------------------
    # Build the row
    # -------------------------
    row: Dict[str, Any] = {}

    for key, state in column_states.items():
        if not state.visible:
            continue

        # -------------------------
        # Locked column (user-level) → placeholder
        # -------------------------
        if state.locked:
            row[key] = {
                "value": LOCKED_PLACEHOLDER,
                "locked": True,
                "lock_reason": {
                    "message": state.lock_reason.unlock_hint if state.lock_reason else "Requirements not met",
                    "blocking_reasons": state.lock_reason.blocking_reasons if state.lock_reason else []
                }
            }
            continue

        # -------------------------
        # Core / Simple / Computed-simple columns
        # -------------------------
        if key in assignment:
            row[key] = {
                "value": assignment[key],
                "locked": False,
            }
            continue

        # -------------------------
        # Advanced columns — need computation
        # -------------------------
        compute_fn = COMPUTATION_MAP.get(key)
        if compute_fn is None:
            continue

        # --- Assignment eligibility check (row-level applicability) ---
        assignment_eligible, assignment_lock_reason = _check_assignment_eligibility(
            key=key,
            assignment=assignment,
            now=now,
            same_type_graded_count=same_type_graded_count,
            has_estimation_fallback=has_estimation_fallback,
        )

        # None = no assignment eligibility exists for this column → proceed
        # False = column does not apply to this assignment → cell is locked
        if assignment_eligible is False:
            row[key] = {
                "value": LOCKED_PLACEHOLDER,
                "locked": True,
                "lock_reason": assignment_lock_reason
            }
            continue

        # --- Execute computation ---
        try:
            result = compute_fn(
                target_assignment=assignment,
                past_assignments=all_assignments,
                now=now,
                context=context
            )

            if result is None:
                row[key] = {"value": None, "locked": False}
                continue

            if not isinstance(result, ComputationResult):
                raise ValueError(f"{key} computation did not return ComputationResult")

            row[key] = {
                "value": result.value,
                "meta": result.diagnostics,
                "locked": False,
            }

        except Exception:
            # Computation failed — return empty cell
            row[key] = {
                "value": None,
                "locked": False,
            }

    return row