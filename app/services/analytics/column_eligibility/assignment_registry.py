"""

Registry of ASSIGNMENT-LEVEL (row-level) eligibility checks only.

These answer: "Does this column logically apply to THIS assignment?"
They do NOT gate/lock columns. They decide cell applicability.

Columns that appear here:
    risk_score              — only uncompleted assignments with due dates
    deadline_sensitivity    — only assignments with due dates in horizon
    effort_efficiency       — requires study_minutes or fallback
    volatility              — requires enough same-type graded history

Columns that do NOT appear here (intentionally):
    predictability_confidence — it is a user-level / meta concept only.
                                No assignment-level applicability.
"""

from app.services.analytics.column_eligibility.assignment.risk_score import (
    check_risk_score_assignment_eligibility,
)
from app.services.analytics.column_eligibility.assignment.deadline_sensitivity import (
    check_deadline_sensitivity_assignment_eligibility,
)
from app.services.analytics.column_eligibility.assignment.effort_efficiency import (
    check_effort_efficiency_assignment_eligibility,
)
from app.services.analytics.column_eligibility.assignment.volatility import (
    check_volatility_assignment_eligibility,
)


# Each value is the raw check function.
# The row builder is responsible for calling each one with its correct arguments.
# Do NOT assume a uniform call signature — each check has its own inputs.
ASSIGNMENT_ELIGIBILITY_CHECKS = {
    "risk_score":             check_risk_score_assignment_eligibility,
    "deadline_sensitivity":   check_deadline_sensitivity_assignment_eligibility,
    "effort_efficiency":      check_effort_efficiency_assignment_eligibility,
    "volatility":             check_volatility_assignment_eligibility,
}