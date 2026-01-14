from dataclasses import dataclass


@dataclass(frozen=True)
class AssignmentDueTimelineReq:
    min_incomplete_assignments_with_due_date: int = 1


@dataclass(frozen=True)
class AssignmentTypeLoadReq:
    min_assignments_any: int = 1
    min_assignments_with_study_time: int = 1


@dataclass(frozen=True)
class AssignmentProgressDeadlineReq:
    min_incomplete_assignments_with_due_date: int = 1