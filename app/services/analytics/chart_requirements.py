from dataclasses import dataclass
from datetime import timedelta

@dataclass(frozen=True)
class RollingGradeTrendRequirements:
    min_classes: int = 1
    min_graded_assignments_per_class: int = 3
    min_class_age: timedelta = timedelta(weeks=3)


CHART_REQUIREMENTS = {
    "rolling_grade_trend": {
        "scope": "per_class",
        "requirements": RollingGradeTrendRequirements()
    }
}
