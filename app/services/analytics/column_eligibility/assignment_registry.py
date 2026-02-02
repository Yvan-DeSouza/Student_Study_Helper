from app.services.analytics.column_eligibility.assignment.volatility import (
    check_volatility_assignment_eligibility,
)
from app.services.analytics.column_eligibility.assignment.deadline_sensitivity import (
    check_deadline_sensitivity_assignment_eligibility,
)
from app.services.analytics.column_eligibility.assignment.effort_efficiency import (
    check_effort_efficiency_assignment_eligibility,
)
from app.services.analytics.column_eligibility.assignment.risk_score import (
    check_risk_score_assignment_eligibility,
)


ASSIGNMENT_ELIGIBILITY_CHECKS = {
    "volatility": check_volatility_assignment_eligibility,
    "deadline_sensitivity": check_deadline_sensitivity_assignment_eligibility,
    "effort_efficiency": check_effort_efficiency_assignment_eligibility,
    "risk_score": check_risk_score_assignment_eligibility,
}
