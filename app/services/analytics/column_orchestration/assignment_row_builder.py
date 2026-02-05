"""

Builds a single assignment row end-to-end.

Responsibilities:
    - Iterates visible columns
    - Returns placeholders for locked columns
    - Dispatches assignment-level eligibility with correct per-column arguments
    - Calls computation only when both user eligibility (locked) AND
      assignment eligibility pass
    - Wraps results in a uniform cell shape

Does NOT:
    - Decide eligibility rules
    - Contain threshold constants
    - Know about UI
"""

from typing import Dict, List, Any, Optional
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
# These are computed ONCE per row, then reused by whichever column needs them.

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
# Each column's assignment check has a DIFFERENT signature.
# This function routes to the correct one with the correct args.
# Returns True if the column applies to this assignment, False if not.

def _check_assignment_eligibility(
    *,
    key: str,
    assignment: dict,
    now: datetime,
    same_type_graded_count: int,
    has_estimation_fallback: bool,
) -> bool:
    """
    Dispatches the assignment-level eligibility check for `key`.

    Returns:
        True  → column applies, proceed to computation
        False → column does not apply, cell = None
        None  → column has no assignment eligibility check at all (proceed to computation)
    """

    if key == "risk_score":
        # signature: check_risk_score_assignment_eligibility(assignment) -> bool
        return check_risk_score_assignment_eligibility(assignment)

    elif key == "deadline_sensitivity":
        # signature: check_deadline_sensitivity_assignment_eligibility(assignment, now, req=default) -> bool
        return check_deadline_sensitivity_assignment_eligibility(assignment, now)

    elif key == "effort_efficiency":
        # signature: check_effort_efficiency_assignment_eligibility(assignment, has_estimation_fallback) -> bool
        return check_effort_efficiency_assignment_eligibility(assignment, has_estimation_fallback)

    elif key == "volatility":
        # signature: check_volatility_assignment_eligibility(assignment, same_type_history_count, req=default) -> bool
        return check_volatility_assignment_eligibility(assignment, same_type_graded_count)

    else:
        # No assignment eligibility for this column (e.g. predictability_confidence).
        # Returning None signals "skip this check, go straight to computation."
        return None


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
        # Locked column → placeholder
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
        # Core / Simple / Computed-simple columns
        # These are already present in the assignment dict
        # (title, grade, study_minutes, days_until_due, etc.)
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
            # Column exists in registry but has no computation adapter
            # and wasn't in the assignment dict. Skip it.
            continue

        # --- Assignment eligibility check (row-level applicability) ---
        assignment_eligible = _check_assignment_eligibility(
            key=key,
            assignment=assignment,
            now=now,
            same_type_graded_count=same_type_graded_count,
            has_estimation_fallback=has_estimation_fallback,
        )

        # None = no assignment eligibility exists for this column → proceed
        # False = column does not apply to this assignment → cell is empty
        if assignment_eligible is False:
            row[key] = {"value": None, "locked": False}
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
            # Computation failed — return empty cell, do not crash the row.
            row[key] = {
                "value": None,
                "locked": False,
            }

    return row