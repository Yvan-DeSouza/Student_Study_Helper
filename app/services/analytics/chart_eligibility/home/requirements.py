from dataclasses import dataclass

@dataclass(frozen=True)
class TimeDistributionReq:
    min_completed_study_sessions_total: int = 1
    min_classes_with_study_time: int = 1
    min_completed_study_sessions_per_class: int = 1

@dataclass(frozen=True)
class WeeklyStudyTrendReq:
    min_completed_study_sessions: int = 2
    min_sessions_in_last_7_days: int = 2

@dataclass(frozen=True)
class AssignmentLoadReq:
    min_incomplete_assignments_with_due_date: int = 1

@dataclass(frozen=True)
class PerformanceRadarReq:
    min_classes: int = 1
    min_study_sessions_or_grades: int = 1