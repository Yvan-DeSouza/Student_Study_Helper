from dataclasses import dataclass


@dataclass(frozen=True)
class SensitivityConfig:
    SIMILARITY_THRESHOLD: float = 0.3
    HIGH: float = 0.5
    MEDIUM: float = 0.2


SENSITIVITY_CONFIG = SensitivityConfig()
