from app.services.analytics.config.assignment import ASSIGNMENT_CONFIG
from app.services.analytics.config.similarity import SIMILARITY_CONFIG


def has_enough_data(past_assignments):
    return len(past_assignments) >= ASSIGNMENT_CONFIG.MIN_ASSIGNMENTS_FOR_ESTIMATION


def class_type_similarity(type_a, type_b):
    coords = SIMILARITY_CONFIG.CLASS_TYPE_COORDINATES
    a = coords.get(type_a, coords["other"])
    b = coords.get(type_b, coords["other"])
    return round(1 - abs(a - b) / 100, 3)


def get_group(assignment_type):
    for group, items in SIMILARITY_CONFIG.GROUPS.items():
        if assignment_type in items:
            return group
    return None


def assignment_type_similarity(type_a, type_b):
    if type_a == type_b:
        return 1.0

    if type_a == "other" or type_b == "other":
        return SIMILARITY_CONFIG.OTHER_SCORE

    group_a = get_group(type_a)
    group_b = get_group(type_b)

    if not group_a or not group_b:
        return SIMILARITY_CONFIG.OTHER_SCORE

    return SIMILARITY_CONFIG.GROUP_SIMILARITY.get(
        (group_a, group_b),
        SIMILARITY_CONFIG.GROUP_SIMILARITY.get((group_b, group_a), 0.0)
    )


def composite_assignment_similarity(
    target_class_type, target_assignment_type, target_class_id,
    past_class_type, past_assignment_type, past_class_id
):
    w = SIMILARITY_CONFIG.WEIGHTS

    return round(
        w["class_type"] * class_type_similarity(target_class_type, past_class_type)
        + w["assignment_type"] * assignment_type_similarity(target_assignment_type, past_assignment_type)
        + w["same_class"] * (1.0 if target_class_id == past_class_id else 0.0),
        3
    )


def normalize_and_rescale(value, past_type, target_type, base_map):
    past_base = base_map.get(past_type)
    target_base = base_map.get(target_type)

    if not past_base or not target_base:
        return None

    return (value / past_base) * target_base


def estimate_expected_minutes(target_class_type, target_assignment_type, target_class_id, past_assignments):
    # NEW
    base = ASSIGNMENT_CONFIG.BASE_TIME_BY_TYPE.get(target_assignment_type,
       ASSIGNMENT_CONFIG.BASE_TIME_BY_TYPE.get("other", 180))

    if not has_enough_data(past_assignments):
        return base

    total, weight_sum = 0, 0

    for past in past_assignments:
        actual = past.get("actual_minutes")
        if actual is None:
            continue

        normalized = normalize_and_rescale(
            actual,
            past["assignment_type"],
            target_assignment_type,
            ASSIGNMENT_CONFIG.BASE_TIME_BY_TYPE,
        )
        if normalized is None:
            continue

        w = composite_assignment_similarity(
            target_class_type, target_assignment_type, target_class_id,
            past["class_type"], past["assignment_type"], past["class_id"]
        )

        total += w * normalized
        weight_sum += w

    return base if weight_sum == 0 else int(round(total / weight_sum))


def estimate_expected_difficulty(target_class_type, target_assignment_type, target_class_id, past_assignments):
    base = ASSIGNMENT_CONFIG.BASE_DIFFICULTY_BY_TYPE.get(target_assignment_type,
       ASSIGNMENT_CONFIG.BASE_DIFFICULTY_BY_TYPE.get("other", 5))

    if not has_enough_data(past_assignments):
        return base

    total, weight_sum = 0, 0

    for past in past_assignments:
        difficulty = past.get("difficulty")
        if difficulty is None:
            continue

        normalized = normalize_and_rescale(
            difficulty,
            past["assignment_type"],
            target_assignment_type,
            ASSIGNMENT_CONFIG.BASE_DIFFICULTY_BY_TYPE,
        )
        if normalized is None:
            continue

        w = composite_assignment_similarity(
            target_class_type, target_assignment_type, target_class_id,
            past["class_type"], past["assignment_type"], past["class_id"]
        )

        total += w * normalized
        weight_sum += w

    if weight_sum == 0:
        return base

    return int(round(min(10, max(1, total / weight_sum))))
