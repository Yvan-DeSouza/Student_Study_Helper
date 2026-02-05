from datetime import datetime, timezone
from typing import Dict, List

from app.services.analytics.computation.workload import (
    compute_daily_active_assignments,
)


def compute_global_workload_stats(
    *,
    all_assignments: List[dict],
    now: datetime | None = None,
) -> Dict[str, float]:
    """
    Computes student-level workload statistics.

    Returns:
        {
            "global_max": float,
            "global_avg": float,
        }
    """
    if now is None:
        now = datetime.now(timezone.utc)

    daily_counts = compute_daily_active_assignments(all_assignments, now)

    if not daily_counts:
        return {
            "global_max": 0.0,
            "global_avg": 0.0,
        }

    values = list(daily_counts.values())

    return {
        "global_max": float(max(values)),
        "global_avg": float(sum(values) / len(values)),
    }


def ensure_global_workload_stats(
    *,
    context: dict,
    all_assignments: List[dict],
    now: datetime | None = None,
) -> None:
    """
    Populates context with global workload stats if not already present.
    """
    if "global_max" in context and "global_avg" in context:
        return

    stats = compute_global_workload_stats(
        all_assignments=all_assignments,
        now=now,
    )

    context.update(stats)
