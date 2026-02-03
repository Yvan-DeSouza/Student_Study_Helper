# services/analytics/config/confidence.py
from dataclasses import dataclass
from math import exp
from app.services.analytics.computation.result import ComputationResult

@dataclass(frozen=True)
class ConfidenceConfig:
    WEIGHTS: dict = None
    DECAY_DAYS: int = 30

    def __post_init__(self):
        object.__setattr__(self, "WEIGHTS", {
            "sample_score": 0.35,
            "similarity_score": 0.25,
            "stability_score": 0.25,
            "recency_score": 0.15
        })

CONFIDENCE_CONFIG = ConfidenceConfig()
