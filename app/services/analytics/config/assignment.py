from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class AssignmentConfig:
    MIN_ASSIGNMENTS_FOR_ESTIMATION: int = 5

    BASE_TIME_BY_TYPE: Dict[str, int] = None
    BASE_DIFFICULTY_BY_TYPE: Dict[str, int] = None

    def __post_init__(self):
        object.__setattr__(self, "BASE_TIME_BY_TYPE", {
            "quiz": 90,
            "homework": 75,
            "lab_report": 180,
            "reading": 90,
            "writing": 240,
            "presentation": 240,
            "project": 210,
            "test": 210,
            "exam": 360,
            "other": 180,
        })

        object.__setattr__(self, "BASE_DIFFICULTY_BY_TYPE", {
            "quiz": 4,
            "reading": 4,
            "presentation": 7,
            "lab_report": 7,
            "writing": 8,
            "homework": 3,
            "project": 7,
            "test": 8,
            "exam": 9,
            "other": 5,
        })


ASSIGNMENT_CONFIG = AssignmentConfig()
