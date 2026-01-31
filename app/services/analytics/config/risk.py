from dataclasses import dataclass
from typing import Dict

@dataclass(frozen=True)
class RiskConfig:
    COMPONENT_WEIGHTS: Dict[str, float] = None
    BUCKETS: dict = None


    def __post_init__(self):
        object.__setattr__(self, "COMPONENT_WEIGHTS", {
            "time_pressure": 0.30,
            "deadline_proximity": 0.20,
            "difficulty": 0.20,
            "history": 0.20,
            "overlap": 0.10
        })
        object.__setattr__(self, "BUCKETS", {
            "Overdue": (-float('inf'), 0),
            "0-2 days": (0, 2),
            "3-5 days": (2, 5),
            "6-10 days": (5, 10),
            "10+ days": (10, float('inf')),
        })

RISK_CONFIG = RiskConfig()
