
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class EligibilityResult:
    eligible: bool

    # Hard block = column should be locked entirely
    hard_blocked: bool = False

    # Structured diagnostics
    missing_requirements: List[str] = field(default_factory=list)
    blocking_reasons: List[str] = field(default_factory=list)

    # Optional confidence floor (used later by orchestrator)
    confidence_floor: Optional[float] = None

    # UX-friendly hint
    unlock_hint: Optional[str] = None


def eligible_result() -> EligibilityResult:
    return EligibilityResult(eligible=True)


def blocked_result(
    *,
    missing_requirements: List[str],
    blocking_reasons: List[str],
    unlock_hint: Optional[str] = None,
    hard_blocked: bool = True,
) -> EligibilityResult:
    return EligibilityResult(
        eligible=False,
        hard_blocked=hard_blocked,
        missing_requirements=missing_requirements,
        blocking_reasons=blocking_reasons,
        unlock_hint=unlock_hint,
    )
