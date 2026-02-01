from dataclasses import dataclass
from typing import Dict

from app.services.columns.categories import ColumnCategory
from app.services.columns.capabilities import (
    ColumnCapabilities,
    CORE_CAPABILITIES,
    SIMPLE_CAPABILITIES,
    COMPUTED_CAPABILITIES,
    ADVANCED_CAPABILITIES,
)


@dataclass(frozen=True)
class ColumnDefinition:
    key: str
    label: str
    category: ColumnCategory
    capabilities: ColumnCapabilities
    requires_eligibility: bool
    default_shown: bool


# =========================
# COLUMN REGISTRY
# =========================

COLUMN_REGISTRY: Dict[str, ColumnDefinition] = {

    # ---------- CORE ----------
    "title": ColumnDefinition(
        key="title",
        label="Title",
        category=ColumnCategory.CORE,
        capabilities=CORE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=True,
    ),
    "assignment_type": ColumnDefinition(
        key="assignment_type",
        label="Type",
        category=ColumnCategory.CORE,
        capabilities=CORE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=True,
    ),
    "class": ColumnDefinition(
        key="class",
        label="Class",
        category=ColumnCategory.CORE,
        capabilities=CORE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=True,
    ),
    "due_at": ColumnDefinition(
        key="due_at",
        label="Due Date",
        category=ColumnCategory.CORE,
        capabilities=CORE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=True,
    ),
    "is_completed": ColumnDefinition(
        key="is_completed",
        label="Completed",
        category=ColumnCategory.CORE,
        capabilities=CORE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=True,
    ),
    "grade": ColumnDefinition(
        key="grade",
        label="Grade",
        category=ColumnCategory.CORE,
        capabilities=CORE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=True,
    ),
    "is_graded": ColumnDefinition(
        key="is_graded",
        label="Graded",
        category=ColumnCategory.CORE,
        capabilities=CORE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=True,
    ),

    # ---------- SIMPLE ----------
    "ponderation": ColumnDefinition(
        key="ponderation",
        label="Weight",
        category=ColumnCategory.SIMPLE,
        capabilities=SIMPLE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=False,
    ),
    "pass_grade": ColumnDefinition(
        key="pass_grade",
        label="Passing Grade",
        category=ColumnCategory.SIMPLE,
        capabilities=SIMPLE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=False,
    ),
    "difficulty": ColumnDefinition(
        key="difficulty",
        label="Difficulty",
        category=ColumnCategory.SIMPLE,
        capabilities=SIMPLE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=False,
    ),
    "expected_grade": ColumnDefinition(
        key="expected_grade",
        label="Expected Grade",
        category=ColumnCategory.SIMPLE,
        capabilities=SIMPLE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=False,
    ),
    "finished_at": ColumnDefinition(
        key="finished_at",
        label="Finished At",
        category=ColumnCategory.SIMPLE,
        capabilities=SIMPLE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=False,
    ),
    "estimated_minutes": ColumnDefinition(
        key="estimated_minutes",
        label="Estimated Time",
        category=ColumnCategory.SIMPLE,
        capabilities=SIMPLE_CAPABILITIES,
        requires_eligibility=False,
        default_shown=False,
    ),

    # ---------- COMPUTED ----------
    "study_minutes": ColumnDefinition(
        key="study_minutes",
        label="Study Minutes",
        category=ColumnCategory.COMPUTED,
        capabilities=COMPUTED_CAPABILITIES,
        requires_eligibility=False,
        default_shown=False,
    ),
    "study_session_count": ColumnDefinition(
        key="study_session_count",
        label="Study Sessions",
        category=ColumnCategory.COMPUTED,
        capabilities=COMPUTED_CAPABILITIES,
        requires_eligibility=False,
        default_shown=False,
    ),
    "days_until_due": ColumnDefinition(
        key="days_until_due",
        label="Days Until Due",
        category=ColumnCategory.COMPUTED,
        capabilities=COMPUTED_CAPABILITIES,
        requires_eligibility=False,
        default_shown=False,
    ),

    # ---------- ADVANCED ----------
    "risk_score": ColumnDefinition(
        key="risk_score",
        label="Risk Score",
        category=ColumnCategory.ADVANCED,
        capabilities=ADVANCED_CAPABILITIES,
        requires_eligibility=True,
        default_shown=False,
    ),
    "effort_efficiency": ColumnDefinition(
        key="effort_efficiency",
        label="Effort Efficiency",
        category=ColumnCategory.ADVANCED,
        capabilities=ADVANCED_CAPABILITIES,
        requires_eligibility=True,
        default_shown=False,
    ),
    "volatility": ColumnDefinition(
        key="volatility",
        label="Volatility",
        category=ColumnCategory.ADVANCED,
        capabilities=ADVANCED_CAPABILITIES,
        requires_eligibility=True,
        default_shown=False,
    ),
    "deadline_sensitivity": ColumnDefinition(
        key="deadline_sensitivity",
        label="Deadline Sensitivity",
        category=ColumnCategory.ADVANCED,
        capabilities=ADVANCED_CAPABILITIES,
        requires_eligibility=True,
        default_shown=False,
    ),
    "predictability_confidence": ColumnDefinition(
        key="predictability_confidence",
        label="Predictability",
        category=ColumnCategory.ADVANCED,
        capabilities=ADVANCED_CAPABILITIES,
        requires_eligibility=True,
        default_shown=False,
    ),
}
