from dataclasses import dataclass
from typing import Dict, Set, Tuple


@dataclass(frozen=True)
class SimilarityConfig:
    CLASS_TYPE_COORDINATES: Dict[str, int]
    GROUPS: Dict[str, Set[str]]
    GROUP_SIMILARITY: Dict[Tuple[str, str], float]
    OTHER_SCORE: float
    WEIGHTS: Dict[str, float]


SIMILARITY_CONFIG = SimilarityConfig(
    CLASS_TYPE_COORDINATES={
        "engineering": 0,
        "math": 10,
        "technology": 15,
        "science": 25,
        "finance": 30,
        "other": 50,
        "social_science": 65,
        "language": 70,
        "art": 100,
    },
    GROUPS={
        "assessment": {"quiz", "test", "exam"},
        "practice": {"homework", "lab_report"},
        "creative": {"project", "presentation"},
        "language": {"reading", "writing"},
    },
    GROUP_SIMILARITY={
        ("assessment", "assessment"): 0.85,
        ("practice", "practice"): 0.75,
        ("creative", "creative"): 0.8,
        ("language", "language"): 0.85,
        ("assessment", "practice"): 0.6,
        ("assessment", "creative"): 0.35,
        ("assessment", "language"): 0.2,
        ("practice", "creative"): 0.5,
        ("practice", "language"): 0.3,
        ("creative", "language"): 0.4,
    },
    OTHER_SCORE=0.3,
    WEIGHTS={
        "class_type": 0.5,
        "assignment_type": 0.3,
        "same_class": 0.2,
    }
)
