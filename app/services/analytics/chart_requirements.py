# chart_requirements.py
from dataclasses import dataclass

@dataclass(frozen=True)
class RollingGradeTrendRequirements:
    min_classes: int = 1
    min_graded_assignments_per_class: int = 3
    min_weeks_since_first_grade: int = 3

@dataclass(frozen=True)
class EffortOutcomeRequirements:
    min_weeks_since_first_grade: int = 3
    min_weeks_since_account_creation: int = 4
    min_study_sessions: int = 10
    min_graded_assignments: int = 4
    min_classes: int = 1

@dataclass(frozen=True)
class PerformanceStabilityRequirements:
    min_weeks_since_first_grade: int = 3
    min_weeks_since_account_creation: int = 4
    min_study_sessions: int = 10
    min_graded_assignments: int = 5
    min_classes: int = 1

@dataclass(frozen=True)
class LagCorrelationRequirements:
    min_weeks_since_first_grade: int = 3
    min_graded_assignments_per_class: int = 3
    min_study_session_per_class: int = 10
    min_classes: int = 1

CHART_REQUIREMENTS = {
    "rolling_grade_trend": {
        "scope": "per_class",
        "requirements": RollingGradeTrendRequirements()
    },
    "effort_outcome_timeline": {
        "scope": "global",
        "requirements": EffortOutcomeRequirements()
    },
    "performance_stability_index": {
        "scope": "global",
        "requirements": PerformanceStabilityRequirements()
    },
    "lag_correlation_heatmap": {
        "scope": "per_class",
        "requirements": LagCorrelationRequirements()
    }
}
