from math import exp
from app.services.analytics.config.confidence import CONFIDENCE_CONFIG
from app.services.analytics.computation.result import ComputationResult


def compute_predictability_confidence(
    sample_count,
    avg_similarity,
    volatility,
    avg_age_days,
):
    """
    Returns confidence score ∈ [0,1] with bucket.
    """
    w = CONFIDENCE_CONFIG.WEIGHTS
    decay = CONFIDENCE_CONFIG.DECAY_DAYS
    sample_score = min(1.0, sample_count / 10)
    similarity_score = max(0.0, min(1.0, avg_similarity))
    stability_score = 1.0 - max(0.0, min(1.0, volatility))
    recency_score = exp(-avg_age_days / decay)
    confidence = (
        w["sample_score"] * sample_score +
        w["similarity_score"] * similarity_score +
        w["stability_score"] * stability_score +
        w["recency_score"] * recency_score
    )



    confidence = max(0.0, min(1.0, confidence))

    return {
        "confidence": round(confidence, 3),
        "bucket": (
            "High" if confidence >= 0.7 else
            "Medium" if confidence >= 0.4 else
            "Low"
        ),
    }


# =================== COLUMN ADAPTER ===================

def compute_predictability_confidence_column(
    *,
    target_assignment: dict,
    past_assignments: list[dict],
    now=None,
):
    """
    Confidence is derived from analytics outputs.
    For now: return None if insufficient data.
    """

    sample_count = len([p for p in past_assignments if p.get("grade") is not None])
    if sample_count < 3:
        return None

    # Placeholder until pipeline aggregation exists
    return {
        "confidence": 0.5,
        "bucket": "Medium",
    }
