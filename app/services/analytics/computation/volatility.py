from math import exp
from datetime import datetime, timezone
from app.services.analytics.computation.expected import composite_assignment_similarity


def compute_volatility(
    target_class_type,
    target_assignment_type,
    target_class_id,
    past_assignments,
    now=None,
    decay_tau_days=30,
):
    """
    Computes normalized outcome volatility ∈ [0,1]

    past_assignments must contain:
    - grade
    - finished_at
    - class_type
    - assignment_type
    - class_id
    """

    if now is None:
        now = datetime.now(timezone.utc)

    weighted_grades = []
    weights = []

    for p in past_assignments:
        grade = p.get("grade")
        finished_at = p.get("finished_at")

        if grade is None or finished_at is None:
            continue

        similarity = composite_assignment_similarity(
            target_class_type,
            target_assignment_type,
            target_class_id,
            p["class_type"],
            p["assignment_type"],
            p["class_id"],
        )

        age_days = (now - finished_at).days
        recency_weight = exp(-age_days / decay_tau_days)

        w = similarity * recency_weight

        if w <= 0:
            continue

        weighted_grades.append(float(grade))
        weights.append(w)

    if not weights or sum(weights) == 0:
        return None

    total_weight = sum(weights)

    mean = sum(g * w for g, w in zip(weighted_grades, weights)) / total_weight

    variance = (
        sum(w * (g - mean) ** 2 for g, w in zip(weighted_grades, weights))
        / total_weight
    )

    volatility = min(1.0, variance / 400)

    return {
        "volatility": round(volatility, 3),
        "variance": round(variance, 2),
        "mean_grade": round(mean, 2),
        "samples": len(weights),
        "total_weight": round(total_weight, 3),
    }


# =================== COLUMN ADAPTER ===================

def compute_volatility_column(
    *,
    target_assignment: dict,
    past_assignments: list[dict],
    now=None,
):
    return compute_volatility(
        target_assignment["class_type"],
        target_assignment["assignment_type"],
        target_assignment["class_id"],
        past_assignments,
        now=now,
    )
