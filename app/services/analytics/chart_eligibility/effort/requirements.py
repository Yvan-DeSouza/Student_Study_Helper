from dataclasses import dataclass

@dataclass(frozen=True)
class TimeSpentVsExpectedReq:
    min_eligible_classes: int = 2
    min_completed_study_sessions_total: int = 8
    min_completed_assignments_total: int = 5
    min_completed_study_sessions_per_class: int = 2
    min_completed_assignments_per_class: int = 2
    min_assignments_with_linked_sessions: int = 2

@dataclass(frozen=True)
class MarginalReturnsReq:
    min_graded_assignments_with_sessions: int = 6
    min_days_since_earliest_study_session: int = 14
    min_days_since_earliest_graded_assignment: int = 10
    min_total_study_hours: int = 4

@dataclass(frozen=True)
class EffortAllocationReq:
    min_classes: int = 2
    min_completed_study_sessions_total: int = 8
    min_total_study_hours: int = 2
    min_completed_study_sessions_per_class: int = 2

@dataclass(frozen=True)
class OutcomeContributionReq:
    min_classes_with_grades: int = 2
    min_graded_assignments_total: int = 5
    min_graded_assignments_per_class: int = 2