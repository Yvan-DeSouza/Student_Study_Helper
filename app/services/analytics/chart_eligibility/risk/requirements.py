# services/analytics/chart_eligibility/risk/requirements.py
from dataclasses import dataclass

@dataclass(frozen=True)
class DeadlineProximityReq:
    # Graph 1: Deadline Proximity Distribution
    # Minimum: At least 1 incomplete assignment with a due date
    min_incomplete_assignments_with_due_date: int = 1


@dataclass(frozen=True)
class RiskCompositionReq:
    # Graph 2: Risk Composition Evolution
    # Minimum: ≥ 5 graded assignments, ≥ 14 days since earliest graded assignment
    min_graded_assignments_total: int = 5
    min_days_since_earliest_graded: int = 14


@dataclass(frozen=True)
class AssignmentRiskBreakdownReq:
    # Graph 3: Assignment Risk Breakdown
    # Minimum: At least 2 incomplete assignments with due dates and ≥ 5 graded assignments
    min_incomplete_assignments_with_due_date: int = 2
    min_graded_assignments: int = 5


@dataclass(frozen=True)
class UrgencyRiskMatrixReq:
    # Graph 4: Urgency Risk Matrix
    # Minimum: ≥ 2 incomplete assignments with due dates, ≥ 2 different deadlines, ≥ 5 graded assignments
    min_incomplete_assignments_with_due_date: int = 2
    min_different_deadline_dates: int = 2
    min_graded_assignments: int = 5
