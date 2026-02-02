from dataclasses import dataclass
from typing import Any, Optional, Dict


@dataclass(frozen=True)
class ComputationResult:
    value: Any
    diagnostics: Optional[Dict[str, Any]] = None
