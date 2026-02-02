from app.services.analytics.computation.expected import composite_assignment_similarity
from app.services.analytics.config.sensitivity import SENSITIVITY_CONFIG
from app.services.analytics.computation.result import ComputationResult


def rank_values(values):
    sorted_pairs = sorted((v, i) for i, v in enumerate(values))
    ranks = [0] * len(values)

    i = 0
    while i < len(sorted_pairs):
        j = i
        while j < len(sorted_pairs) and sorted_pairs[j][0] == sorted_pairs[i][0]:
            j += 1

        avg_rank = (i + j - 1) / 2 + 1
        for k in range(i, j):
            _, idx = sorted_pairs[k]
            ranks[idx] = avg_rank

        i = j

    return ranks


def pearson_correlation(x, y):
    n = len(x)
    if n == 0:
        return None

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    num = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    den_x = sum((xi - mean_x) ** 2 for xi in x)
    den_y = sum((yi - mean_y) ** 2 for yi in y)

    if den_x == 0 or den_y == 0:
        return 0.0

    return num / (den_x ** 0.5 * den_y ** 0.5)


def spearman_correlation(x, y):
    return pearson_correlation(rank_values(x), rank_values(y))


def compute_deadline_sensitivity(
    target_class_type,
    target_assignment_type,
    target_class_id,
    past_assignments,
):
    delays, grades = [], []

    for p in past_assignments:
        grade = p.get("grade")
        due_at = p.get("due_at")
        started_at = p.get("started_at") or p.get("expected_started_at")

        if None in (grade, due_at, started_at):
            continue

        similarity = composite_assignment_similarity(
            target_class_type,
            target_assignment_type,
            target_class_id,
            p["class_type"],
            p["assignment_type"],
            p["class_id"],
        )

        if similarity < SENSITIVITY_CONFIG.SIMILARITY_THRESHOLD:
            continue

        delays.append((due_at - started_at).days)
        grades.append(float(grade))

    if len(delays) < 2:
        return None

    rho = spearman_correlation(delays, grades)
    if rho is None:
        return None

    sensitivity = abs(rho)

    if sensitivity > SENSITIVITY_CONFIG.HIGH:
        bucket = "High"
    elif sensitivity >= SENSITIVITY_CONFIG.MEDIUM:
        bucket = "Medium"
    else:
        bucket = "Low"

    return {
        "sensitivity": round(sensitivity, 3),
        "rho": round(rho, 3),
        "samples": len(delays),
        "bucket": bucket,
    }

# =================== COLUMN ADAPTER ===================

def compute_deadline_sensitivity_column(
    *,
    target_assignment: dict,
    past_assignments: list[dict],
    now=None,
):
    return compute_deadline_sensitivity(
        target_assignment["class_type"],
        target_assignment["assignment_type"],
        target_assignment["class_id"],
        past_assignments,
    )
