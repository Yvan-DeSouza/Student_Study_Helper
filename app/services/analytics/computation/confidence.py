# app/services/analytics/computation/confidence.py

from math import exp


def compute_predictability_confidence(
    sample_count,
    avg_similarity,
    volatility,
    avg_age_days,
):
    """
    Returns confidence score ∈ [0,1] with bucket.
    """

    sample_score = min(1.0, sample_count / 10)
    similarity_score = max(0.0, min(1.0, avg_similarity))
    stability_score = 1.0 - max(0.0, min(1.0, volatility))
    recency_score = exp(-avg_age_days / 30)

    confidence = (
        0.35 * sample_score +
        0.25 * similarity_score +
        0.25 * stability_score +
        0.15 * recency_score
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
