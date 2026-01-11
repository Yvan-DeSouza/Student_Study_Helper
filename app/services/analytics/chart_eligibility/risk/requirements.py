from dataclasses import dataclass

@dataclass(frozen=True)
class DeadlineProximityReq:
    min_incomplete_assignments_with_due_date: int = 1

@dataclass(frozen=True)
class RiskCompositionReq:
    min_graded_assignments_total: int = 5
    min_days_since_earliest_graded: int = 14

@dataclass(frozen=True)
class AssignmentRiskBreakdownReq:
    min_incomplete_assignments_with_due_date: int = 2
    min_graded_assignments: int = 5

@dataclass(frozen=True)
class UrgencyRiskMatrixReq:
    min_incomplete_assignments_with_due_date: int = 2
    min_different_deadline_dates: int = 2
    min_graded_assignments: int = 5