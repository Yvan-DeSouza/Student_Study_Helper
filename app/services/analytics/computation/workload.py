from datetime import datetime, timezone
from collections import defaultdict


def assignment_active_window(assignment: dict, now: datetime):
    """
    Returns (start, end) timestamps for when an assignment is active.
    """
    start = (
        assignment.get("created_at")
        or assignment.get("started_at")
        or assignment.get("expected_started_at")
        or now
    )

    end = (
        assignment.get("finished_at")
        or assignment.get("due_at")
        or now
    )

    if start > end:
        start, end = end, start

    return start, end


def compute_daily_active_assignments(assignments: list[dict], now=None):
    """
    Returns:
        dict[date -> count of active assignments]
    """
    if now is None:
        now = datetime.now(timezone.utc)

    daily_counts = defaultdict(int)

    for a in assignments:
        start, end = assignment_active_window(a, now)

        current = start.date()
        end_date = end.date()

        while current <= end_date:
            daily_counts[current] += 1
            current = current.fromordinal(current.toordinal() + 1)

    return daily_counts




def compute_assignment_overlap_global(
    *,
    target_assignment: dict,
    all_assignments: list[dict],
    context: dict,
    now=None,
):
    """
    Computes workload overlap normalized against global student workload.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    global_max = context.get("global_max", 0.0)
    global_avg = context.get("global_avg", 0.0)

    if global_max <= 0 or global_avg <= 0:
        return 0.0
    print("GLOBAL MAX/AVG:", global_max, ':' ,global_avg)
    daily_counts = compute_daily_active_assignments(all_assignments, now)
    print(daily_counts)

    start, end = assignment_active_window(target_assignment, now)

    days = []
    current = start.date()
    end_date = end.date()

    while current <= end_date:
        days.append(daily_counts.get(current, 0))
        current = current.fromordinal(current.toordinal() + 1)

    if not days:
        return 0.0

    local_avg = sum(days) / len(days)

    baseline_pressure = local_avg / global_avg
    ceiling_pressure = local_avg / global_max

    score = 0.6 * baseline_pressure + 0.4 * ceiling_pressure
    return min(1.0, score)
