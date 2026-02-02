from dataclasses import dataclass
from typing import Dict, Optional
from app.services.columns.display import ColumnDisplayMode
from app.services.columns import COLUMN_REGISTRY
from app.services.columns.categories import NON_HIDEABLE_CATEGORIES
from app.services.analytics.column_eligibility.base import EligibilityResult


# -------------------------
# Column State Definition
# -------------------------

@dataclass(frozen=True)
class ColumnState:
    key: str
    label: str

    # visibility state
    visible: bool
    locked: bool

    # capability exposure (post-resolution)
    sortable: bool
    filterable: bool
    selectable: bool
    display_mode: ColumnDisplayMode

    # diagnostics
    lock_reason: Optional[EligibilityResult] = None


# -------------------------
# Resolver
# -------------------------

def resolve_column_states(
    *,
    page_name: str,
    user_column_prefs: Dict[str, bool],
    eligibility_results: Dict[str, EligibilityResult],
) -> Dict[str, ColumnState]:
    """
    Resolves final column states for a given page.

    Inputs:
    - registry metadata
    - user intent (shown_assignment_columns)
    - eligibility results (advanced columns)

    Output:
    - column_key -> ColumnState
    """

    resolved: Dict[str, ColumnState] = {}

    for key, col in COLUMN_REGISTRY.items():
        eligibility = eligibility_results.get(key)

        # -------------------------
        # Locked?
        # -------------------------
        locked = False
        lock_reason = None

        if col.requires_eligibility:
            if eligibility is None or not eligibility.eligible:
                locked = True
                lock_reason = eligibility

        # -------------------------
        # Visible?
        # -------------------------
        if col.category in NON_HIDEABLE_CATEGORIES:
            visible = True
        else:
            visible = user_column_prefs.get(key, col.default_shown)

        # Locked columns may still be visible (metadata controls this)
        if locked and not col.capabilities.visible_when_locked:
            visible = False

        # -------------------------
        # Capability resolution
        # -------------------------
        sortable = col.capabilities.sortable and not locked
        filterable = col.capabilities.filterable and not locked
        selectable = col.capabilities.selectable

        if not visible:
            display_mode = ColumnDisplayMode.HIDDEN
        elif locked:
            display_mode = ColumnDisplayMode.LOCKED
        else:
            display_mode = ColumnDisplayMode.NORMAL

        resolved[key] = ColumnState(
            key=key,
            label=col.label,
            visible=visible,
            locked=locked,
            sortable=sortable,
            filterable=filterable,
            selectable=selectable,
            display_mode=display_mode,
            lock_reason=lock_reason,
        )


    return resolved
