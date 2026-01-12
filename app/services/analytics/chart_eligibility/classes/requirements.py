from dataclasses import dataclass

@dataclass(frozen=True)
class GradeVsStudyTimeReq:
    min_classes_with_grade: int = 1
    min_completed_study_sessions_total: int = 1
    min_avg_grade_per_class: int = 1  # Class must have grade
    min_study_time_per_class: int = 1  # Class must have ≥1 session

@dataclass(frozen=True)
class ClassHealthReq:
    min_assignments_total: int = 1