from app.services.analytics.computation.expected import composite_assignment_similarity

def rank_values(values):
    """
    Assigns ranks to values (average rank for ties).
    Returns list of floats.
    """
    sorted_pairs = sorted((v, i) for i, v in enumerate(values))
    ranks = [0] * len(values)

    i = 0
    while i < len(sorted_pairs):
        j = i
        while j < len(sorted_pairs) and sorted_pairs[j][0] == sorted_pairs[i][0]:
            j += 1

        avg_rank = (i + j - 1) / 2 + 1  # ranks start at 1
        for k in range(i, j):
            _, original_index = sorted_pairs[k]
            ranks[original_index] = avg_rank

        i = j

    return ranks


def pearson_correlation(x, y):
    """
    Computes Pearson correlation coefficient.
    """
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
    """
    Pure Python Spearman correlation.
    """
    rx = rank_values(x)
    ry = rank_values(y)
    return pearson_correlation(rx, ry)


def compute_deadline_sensitivity(
    target_class_type,
    target_assignment_type,
    target_class_id,
    past_assignments,
    similarity_threshold=0.3,
):
    """
    Computes deadline sensitivity |ρ| using Spearman correlation.

    past_assignments must contain:
    - grade
    - due_at
    - started_at OR expected_started_at
    """

    delays = []
    grades = []

    for p in past_assignments:
        grade = p.get("grade")
        due_at = p.get("due_at")
        started_at = p.get("started_at") or p.get("expected_started_at")

        if grade is None or due_at is None or started_at is None:
            continue

        similarity = composite_assignment_similarity(
            target_class_type,
            target_assignment_type,
            target_class_id,
            p["class_type"],
            p["assignment_type"],
            p["class_id"],
        )

        if similarity < similarity_threshold:
            continue

        delay_days = (due_at - started_at).days

        delays.append(delay_days)
        grades.append(float(grade))

    if len(delays) < 2:
        return None

    rho = spearman_correlation(delays, grades)
    if rho is None:
        return None


    sensitivity = abs(rho)

    return {
        "sensitivity": round(sensitivity, 3),
        "rho": round(rho, 3),
        "samples": len(delays),
        "bucket": (
            "High" if sensitivity > 0.5 else
            "Medium" if sensitivity >= 0.2 else
            "Low"
        ),
    }
