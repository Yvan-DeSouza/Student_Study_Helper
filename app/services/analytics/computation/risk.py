from app.services.analytics.computation.expected import composite_assignment_similarity, estimate_expected_difficulty
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from app.services.analytics.config.risk import RISK_CONFIG
from app.services.analytics.computation.result import ComputationResult
from app.services.analytics.computation.global_workload import (
    ensure_global_workload_stats,
)
from app.services.analytics.computation.workload import (
    compute_assignment_overlap_global,
)



# =================== TIME & URGENCY ===================

def compute_days_until_due(due_at, now=None):
    """
    Returns days until deadline as float.
    Negative = overdue.
    """
    if due_at is None:
        return None

    if now is None:
        now = datetime.now(timezone.utc)

    delta = due_at - now
    return delta.total_seconds() / 86400


def urgency_score(days_until_due, tau=7):
    """
    Exponential urgency curve.
    Output ∈ [0, 1]
    tau = decay constant (default 7 days)
    """

    if days_until_due is None:
        return 0

    if days_until_due < 0:
        return 1.0  # overdue = max urgency

    return float(np.exp(-days_until_due / tau))


def deadline_proximity_bucket(days_until_due):
    """
    Fixed human-interpretable buckets for urgency.
    Returns bucket label.
    """
    if days_until_due is None:
        return None
    
    for label, (low, high) in RISK_CONFIG.BUCKETS.items():
        if low < days_until_due <= high:
            return label
    return "10+ days"


# =================== NORMALIZATION ===================

def min_max_normalize(series):
    series = series.astype(float)
    series = series.fillna(series.mean())

    if series.empty:
        return series

    min_val = series.min()
    max_val = series.max()

    if min_val == max_val:
        return pd.Series(0.5, index=series.index)

    return (series - min_val) / (max_val - min_val)

def normalize_1_to_10(series):
    series = series.astype(float)
    series = series.fillna(series.mean())

    if series.empty:
        return series

    # Clamp to expected scale to avoid weird values
    series = series.clip(lower=1, upper=10)

    return (series - 1) / 9


# =================== RISK COMPONENTS ===================

def time_pressure_score(days_until_due, tau=7):
    """
    Same as urgency_score but renamed for semantic clarity.
    Used in risk composition.
    """
    return urgency_score(days_until_due, tau)


def compute_workload_overlap(active_assignments_per_day, max_seen):
    """
    Normalized workload pressure between [0,1]
    """
    if max_seen == 0:
        return 0.0

    return min(1.0, active_assignments_per_day / max_seen)


def grade_to_risk(grade, min_grade=50, max_grade=100):
    """
    Convert a numeric grade into a normalized risk score between [0,1].
    """
    if grade is None or pd.isna(grade):
        return 0.0

    norm = (grade - min_grade) / (max_grade - min_grade)
    norm = max(0, min(1, norm))
    return 1 - norm


def historical_risk_from_history(
    target_class_type,
    target_assignment_type,
    target_class_id,
    past_risk_assignments,
    min_total_weight=1.0
):
    """
    Compute historical risk using similarity-weighted past grades.
    """

    weighted_sum = 0.0
    weight_total = 0.0

    for past in past_risk_assignments:
        grade = past.get("grade")
        if grade is None:
            continue

        w = composite_assignment_similarity(
            target_class_type,
            target_assignment_type,
            target_class_id,
            past["class_type"],
            past["assignment_type"],
            past["class_id"]
        )

        if w <= 0:
            continue

        weighted_sum += w * grade
        weight_total += w

    # Not enough reliable signal
    if weight_total < min_total_weight:
        return 0.0

    avg_grade = weighted_sum / weight_total
    return grade_to_risk(avg_grade)





# =================== ASSIGNMENT RISK COMPUTATION ===================

def compute_assignment_risk(components, weights=None):
    """
    Computes explainable risk score.

    components = {
        "time_pressure": float between [0,1],
        "deadline_proximity": float between [0,1],
        "difficulty": float between [0,1],
        "history": float between [0,1],
        "overlap": float between [0,1]
    }

    Returns:
    {
        "total_risk": float,
        "breakdown": dict of weighted contributions
    }
    """

    if weights is None:
        weights = RISK_CONFIG.COMPONENT_WEIGHTS


    risk_breakdown = {}
    total_risk = 0.0

    for key, value in components.items():
        if value is None or not np.isfinite(value):
            value = 0.0

        weight = weights.get(key, 0)
        contribution = weight * value

        if not np.isfinite(contribution):
            contribution = 0.0

        risk_breakdown[key] = round(contribution, 3)
        total_risk += contribution


    return {
        "total_risk": round(total_risk, 3),
        "breakdown": risk_breakdown
    }


# =================== WEEKLY RISK AGGREGATION ===================

def aggregate_weekly_risk_components(df, week_col='week'):
    """
    Aggregates risk components by week for stacked area chart.
    
    df must have columns:
    - week_col
    - time_pressure
    - difficulty
    - overlap
    - history
    
    Returns DataFrame with weekly averages.
    """
    if df.empty:
        return pd.DataFrame()
    
    component_cols = ['time_pressure', 'difficulty', 'overlap', 'history']
    existing_cols = [col for col in component_cols if col in df.columns]
    
    if not existing_cols:
        return pd.DataFrame()
    
    weekly = df.groupby(week_col)[existing_cols].mean().reset_index()
    return weekly

# =================== COLUMN ADAPTER ===================

def compute_assignment_risk_column(
    *,
    target_assignment: dict,
    past_assignments: list[dict],
    now=None,
    context: dict | None = None,
):
    """
    Adapter for column system.
    Builds components, then calls compute_assignment_risk.
    """

    if now is None:
        now = datetime.now(timezone.utc)

    days_until_due = compute_days_until_due(
        target_assignment.get("due_at"),
        now,
    )

    # ALL assignments that could overlap

    all_assignments = [target_assignment] + past_assignments

    ensure_global_workload_stats(
        context=context,
        all_assignments=all_assignments,
        now=now,
    )

    overlap = compute_assignment_overlap_global(
        target_assignment=target_assignment,
        all_assignments=all_assignments,
        context=context,
        now=now,
    )


    components = {
        "time_pressure": time_pressure_score(days_until_due),

        "difficulty": normalize_1_to_10(
            pd.Series([target_assignment['difficulty']])
        ).iloc[0]
        if target_assignment['difficulty'] is not None
        else normalize_1_to_10(
            pd.Series([
                estimate_expected_difficulty(
                    target_assignment["class_type"],
                    target_assignment["assignment_type"],
                    target_assignment["class_id"],
                    past_assignments,
                )
            ])
        ).iloc[0],

        "history": historical_risk_from_history(
            target_assignment["class_type"],
            target_assignment["assignment_type"],
            target_assignment["class_id"],
            past_assignments,
        ),

        "overlap": overlap,
    }
    risk = compute_assignment_risk(components)
    risk_breakdown = risk["breakdown"]
    for key, value in risk_breakdown.items():
        risk_breakdown[key] = value / risk['total_risk'] if risk['total_risk'] > 0 else 0.0
    return ComputationResult(
        value=risk["total_risk"],
        diagnostics={
            "breakdown": risk["breakdown"]
        }
    )

