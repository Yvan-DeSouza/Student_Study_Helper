
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Optional, Set


@dataclass(frozen=True)
class UserStats:
    total_assignments: int
    completed_assignments: int
    graded_assignments: int
    assignments_with_due_date: int

    distinct_assignment_types: int

    earliest_graded_date: Optional[datetime]
    days_since_earliest_graded: Optional[int]


def compute_user_stats(assignments: Iterable[dict], now: datetime) -> UserStats:
    total = 0
    completed = 0
    graded = 0
    with_due = 0

    assignment_types: Set[str] = set()
    graded_dates = []

    for a in assignments:
        total += 1

        if a.get("is_completed"):
            completed += 1

        if a.get("is_graded") and a.get("grade") is not None:
            graded += 1
            if a.get("finished_at"):
                graded_dates.append(a["finished_at"])

        if a.get("due_at") is not None:
            with_due += 1

        if a.get("assignment_type"):
            assignment_types.add(a["assignment_type"])

    earliest = min(graded_dates) if graded_dates else None
    days_span = (now - earliest).days if earliest else None

    return UserStats(
        total_assignments=total,
        completed_assignments=completed,
        graded_assignments=graded,
        assignments_with_due_date=with_due,
        distinct_assignment_types=len(assignment_types),
        earliest_graded_date=earliest,
        days_since_earliest_graded=days_span,
    )
