from dataclasses import dataclass

@dataclass(frozen=True)
class RollingGradeTrendReq:
    min_classes: int = 1
    min_graded_assignments_per_class: int = 3
    min_weeks_since_first_grade: int = 4

@dataclass(frozen=True)
class StabilityIndexReq:
    min_classes: int = 2
    min_graded_assignments: int = 6
    min_study_sessions: int = 10
    min_weeks_since_first_grade: int = 3
    min_weeks_since_account_creation: int = 4

@dataclass(frozen=True)
class EffortOutcomeReq:
    min_classes: int = 1
    min_graded_assignments: int = 3
    min_study_sessions: int = 6
    min_weeks_since_first_grade: int = 4
    min_weeks_since_account_creation: int = 4

@dataclass(frozen=True)
class LagCorrelationReq:
    min_classes: int = 2
    min_graded_assignments_per_class: int = 3
    min_study_sessions_per_class: int = 8
    min_weeks_since_first_grade: int = 3
