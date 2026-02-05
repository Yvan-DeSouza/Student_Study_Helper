from math import exp
from app.services.analytics.config.confidence import CONFIDENCE_CONFIG
from app.services.analytics.computation.result import ComputationResult
from app.services.analytics.computation.aggregates import (
    aggregate_similarity_and_recency
)
from app.services.analytics.computation.volatility import compute_volatility_column


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
    """

    # ----------------------------
    # Aggregate shared signals
    # ----------------------------
    aggregates = aggregate_similarity_and_recency(
        target_assignment=target_assignment,
        past_assignments=past_assignments,
        now=now,
    )

    if not aggregates:
        return None

    sample_count = aggregates["sample_count"]

    # Minimum sample rule (same spirit as other analytics)
    if sample_count < 3:
        return None

    avg_similarity = aggregates["avg_similarity"]
    avg_age_days = aggregates["avg_age_days"]

    # ----------------------------
    # Volatility (reuse existing computation)
    # ----------------------------
    volatility_result = compute_volatility_column(
        target_assignment=target_assignment,
        past_assignments=past_assignments,
        now=now,
    )

    volatility = (
        volatility_result.value
        if volatility_result is not None
        else 1.0
    )

    # ----------------------------
    # Final confidence score
    # ----------------------------
    result = compute_predictability_confidence(
        sample_count=sample_count,
        avg_similarity=avg_similarity,
        volatility=volatility,
        avg_age_days=avg_age_days,
    )

    return ComputationResult(
        value=result["confidence"],
        diagnostics={
            "bucket": result["bucket"]
        }
    )
