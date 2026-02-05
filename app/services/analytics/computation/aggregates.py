from math import exp
from datetime import datetime, timezone
from app.services.analytics.computation.expected import composite_assignment_similarity


def aggregate_similarity_and_recency(
    *,
    target_assignment: dict,
    past_assignments: list[dict],
    now=None,
    decay_tau_days=30,
):
    """
    Computes:
    - avg_similarity (weighted by recency)
    - avg_age_days (weighted)
    - sample_count
    """

    if now is None:
        now = datetime.now(timezone.utc)

    weighted_similarities = []
    weighted_ages = []
    weights = []

    for p in past_assignments:
        grade = p.get("grade")
        finished_at = p.get("finished_at")

        if grade is None or finished_at is None:
            continue

        similarity = composite_assignment_similarity(
            target_assignment["class_type"],
            target_assignment["assignment_type"],
            target_assignment["class_id"],
            p["class_type"],
            p["assignment_type"],
            p["class_id"],
        )

        age_days = (now - finished_at).days
        recency_weight = exp(-age_days / decay_tau_days)
        w = similarity * recency_weight

        if w <= 0:
            continue

        weighted_similarities.append(similarity * w)
        weighted_ages.append(age_days * w)
        weights.append(w)

    if not weights:
        return None

    total_weight = sum(weights)

    return {
        "sample_count": len(weights),
        "avg_similarity": sum(weighted_similarities) / total_weight,
        "avg_age_days": sum(weighted_ages) / total_weight,
    }
