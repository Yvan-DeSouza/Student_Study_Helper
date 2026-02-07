
import pandas as pd
import numpy as np
from app.services.analytics.computation.result import ComputationResult
from app.services.analytics.computation.expected import estimate_expected_minutes


# =================== EFFORT RATIO ===================


def effort_ratio(actual, expected):
    """
    Compute actual vs expected effort ratio.
    Returns None if expected is 0 or None.
    """
    if actual is None or expected in (None, 0):
        return None

    return round(actual / expected, 2)


def compute_effort_score(actual, expected):
    """
    Compute effort score (0-100) with bell curve around optimal.
    Optimal ratio = 1.0
    score = 100 - 40 * (ratio - 1) ** 2
    """
    ratio = effort_ratio(actual, expected)
    if ratio is None:
        return None

    score = 100 - 40 * (ratio - 1) ** 2
    return round(max(0, score), 1)


# =================== MARGINAL RETURNS ===================


def cumulative_effort_outcome(assignments):
    """
    Compute cumulative effort vs outcome points.

    assignments: list of dicts with:
        - finished_at (datetime)
        - actual_minutes
        - grade

    Returns list of {"effort": cumulative_minutes, "outcome": grade}
    """
    # Sort by finished_at
    sorted_assignments = sorted(
        [a for a in assignments
            if (
                a.get('finished_at') is not None and
                a.get('actual_minutes') is not None and
                a.get('grade') is not None
            )
        ],
        key=lambda x: x['finished_at']
    )

    effort = 0
    data = []

    for a in sorted_assignments:
        effort += a['actual_minutes']
        data.append({
            "effort": effort,
            "outcome": float(a['grade'])
        })

    return data


def smooth_marginal_returns(data, window=3):
    """
    Apply rolling average to smooth the curve.
    """
    if len(data) < window:
        return data

    df = pd.DataFrame(data)
    df['outcome_smooth'] = df['outcome'].rolling(window=window, min_periods=1).mean()

    return [
        {"effort": row['effort'], "outcome": round(row['outcome_smooth'], 1)}
        for _, row in df.iterrows()
    ]


# =================== ALLOCATION & CONTRIBUTION ===================


def effort_allocation_by_class(study_sessions):
    """
    Compute effort allocation percentage by class.

    study_sessions: list of dicts with:
        - class_id
        - duration_minutes

    Returns dict: {class_id: allocation_percentage}
    """
    totals = {}
    total_time = 0

    for s in study_sessions:
        if s.get('duration_minutes'):
            totals[s['class_id']] = totals.get(s['class_id'], 0) + s['duration_minutes']
            total_time += s['duration_minutes']

    if total_time == 0:
        return {}

    return {
        k: round(v / total_time, 3)
        for k, v in totals.items()
    }


def outcome_contribution_by_class(assignments):
    """
    Compute outcome contribution percentage by class.

    assignments: list of dicts with:
        - class_id
        - grade

    Returns dict: {class_id: contribution_percentage}
    """
    totals = {}
    total_grade = 0

    for a in assignments:
        if a.get('grade'):
            grade = float(a['grade'])
            totals[a['class_id']] = totals.get(a['class_id'], 0) + grade
            total_grade += grade

    if total_grade == 0:
        return {}

    return {
        k: round(v / total_grade, 3)
        for k, v in totals.items()
    }


# =================== COLUMN ADAPTER ===================


def compute_effort_efficiency(
    *,
    target_assignment: dict,
    past_assignments: list[dict],
    now=None,
    context: dict = None,

):
    """
    Column adapter for effort efficiency.

    Uses study_minutes (actual time spent, from hybrid property)
    against estimated_minutes (user-provided estimate).
    """

    actual = target_assignment.get("study_minutes")
    if target_assignment.get("estimated_minutes"):
        expected = target_assignment.get("estimated_minutes")
        guess = False
    else:
        expected = estimate_expected_minutes(
            target_assignment.get("class_type"),   
            target_assignment.get("assignment_type"),
            target_assignment.get("class_id"),  
            past_assignments,
        )
        guess = True

    return ComputationResult(
        value=compute_effort_score(actual, expected),
        diagnostics={
            "ratio": effort_ratio(actual, expected),
            'actual': actual,
            'expected': expected,
            'is_guess': guess,
        },
    )