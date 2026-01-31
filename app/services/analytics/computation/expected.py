


# =================== CONSTANTS ===================

MIN_ASSIGNMENTS_FOR_ESTIMATION = 5


BASE_TIME_BY_ASSIGNMENT_TYPE = {
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
}


BASE_DIFFICULTY_BY_ASSIGNMENT_TYPE = {
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
}


CLASS_TYPE_COORDINATES = {
    "engineering": 0,
    "math": 10,
    "technology": 15,
    "science": 25,
    "finance": 30,
    "other": 50,
    "social_science": 65,
    "language": 70,
    "art": 100,
}


GROUPS = {
    "assessment": {"quiz", "test", "exam"},
    "practice": {"homework", "lab_report"},
    "creative": {"project", "presentation"},
    "language": {"reading", "writing"}
}


GROUP_SIMILARITY = {
    ("assessment", "assessment"): 0.85,
    ("practice", "practice"): 0.75,
    ("creative", "creative"): 0.8,
    ("language", "language"): 0.85,
    ("assessment", "practice"): 0.6,
    ("assessment", "creative"): 0.35,
    ("assessment", "language"): 0.2,
    ("practice", "creative"): 0.5,
    ("practice", "language"): 0.3,
    ("creative", "language"): 0.4
}


OTHER_SCORE = 0.3


# =================== DATA SUFFICIENCY ===================

def has_enough_data(past_assignments):
    return len(past_assignments) >= MIN_ASSIGNMENTS_FOR_ESTIMATION


# =================== SIMILARITY FUNCTIONS ===================

def class_type_similarity(type_a, type_b):
    a = CLASS_TYPE_COORDINATES.get(type_a, 50)
    b = CLASS_TYPE_COORDINATES.get(type_b, 50)
    return round(1 - abs(a - b) / 100, 3)


def get_group(assignment_type):
    for group, items in GROUPS.items():
        if assignment_type in items:
            return group
    return None


def assignment_type_similarity(type_a, type_b):
    if type_a == type_b:
        return 1.0
    if type_a == "other" or type_b == "other":
        return OTHER_SCORE

    group_a = get_group(type_a)
    group_b = get_group(type_b)

    if group_a is None or group_b is None:
        return OTHER_SCORE

    return GROUP_SIMILARITY.get(
        (group_a, group_b),
        GROUP_SIMILARITY.get((group_b, group_a), 0.0)
    )




def composite_assignment_similarity(target_class_type, target_assignment_type, target_class_id,
                                   past_class_type, past_assignment_type, past_class_id):
    """
    Composite similarity score combining multiple factors.
    Returns weighted similarity in [0, 1].
    """
    class_sim = class_type_similarity(target_class_type, past_class_type)
    type_sim = assignment_type_similarity(target_assignment_type, past_assignment_type)
    same_class_bonus = 1.0 if target_class_id == past_class_id else 0
   
    return round(
        0.5 * class_sim +
        0.3 * type_sim +
        0.2 * same_class_bonus,
        3
    )


# =================== NORMALIZATION HELPERS ===================

def normalize_and_rescale(value, past_type, target_type, base_map):
    past_base = base_map.get(past_type)
    target_base = base_map.get(target_type)

    if past_base is None or target_base is None or past_base == 0:
        return None


    return (value / past_base) * target_base



# =================== ESTIMATION FUNCTIONS ===================

def estimate_expected_minutes(target_class_type, target_assignment_type, target_class_id,
                              past_assignments):
    base = BASE_TIME_BY_ASSIGNMENT_TYPE.get(target_assignment_type, 180)

    if not has_enough_data(past_assignments):
        return base

    weighted_sum = 0
    weight_total = 0

    for past in past_assignments:
        actual = past.get("actual_minutes")
        if actual is None:
            continue

        normalized = normalize_and_rescale(
            actual,
            past["assignment_type"],
            target_assignment_type,
            BASE_TIME_BY_ASSIGNMENT_TYPE
        )

        if normalized is None:
            continue

        w = composite_assignment_similarity(
            target_class_type, target_assignment_type, target_class_id,
            past["class_type"], past["assignment_type"], past["class_id"]
        )

        weighted_sum += w * normalized
        weight_total += w

    if weight_total == 0:
        return base

    return int(round(weighted_sum / weight_total))


def estimate_expected_difficulty(target_class_type, target_assignment_type, target_class_id,
                                 past_assignments):
    base = BASE_DIFFICULTY_BY_ASSIGNMENT_TYPE.get(target_assignment_type, 5)

    if not has_enough_data(past_assignments):
        return base

    weighted_sum = 0
    weight_total = 0

    for past in past_assignments:
        difficulty = past.get("difficulty")
        if difficulty is None:
            continue

        normalized = normalize_and_rescale(
            difficulty,
            past["assignment_type"],
            target_assignment_type,
            BASE_DIFFICULTY_BY_ASSIGNMENT_TYPE
        )

        if normalized is None:
            continue

        w = composite_assignment_similarity(
            target_class_type, target_assignment_type, target_class_id,
            past["class_type"], past["assignment_type"], past["class_id"]
        )

        weighted_sum += w * normalized
        weight_total += w

    if weight_total == 0:
        return base

    final = weighted_sum / weight_total
    return int(round(min(10, max(1, final))))
