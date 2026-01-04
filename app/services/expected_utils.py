# app/services/expected_utils.py

import pandas as pd
import numpy as np

# =================== CONSTANTS ===================

MIN_ASSIGNMENTS_FOR_ESTIMATION = 6

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

DEFAULT_ASSIGNMENT_TYPES = [
    "homework", "quiz", "project", "writing",
    "test", "exam", "lab_report", "presentation",
    "reading", "other"
]

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
    """Check if we have enough data for estimation."""
    return len(past_assignments) >= MIN_ASSIGNMENTS_FOR_ESTIMATION


# =================== SIMILARITY FUNCTIONS ===================

def class_type_similarity(type_a, type_b):
    """
    Compute similarity between class types using coordinate distance.
    Returns value in [0, 1].
    """
    a = CLASS_TYPE_COORDINATES.get(type_a, 50)
    b = CLASS_TYPE_COORDINATES.get(type_b, 50)
    
    distance = abs(a - b)
    return round(1 - distance / 100, 3)


def get_group(assignment_type):
    """Get the group for an assignment type."""
    for group, items in GROUPS.items():
        if assignment_type in items:
            return group
    return None


def assignment_type_similarity(type_a, type_b):
    """
    Compute similarity between assignment types.
    Returns value in [0, 1].
    """
    # Same exact type
    if type_a == type_b:
        return 1.0
    
    # Handle "other"
    if type_a == "other" or type_b == "other":
        return OTHER_SCORE
    
    group_a = get_group(type_a)
    group_b = get_group(type_b)
    
    # If either type is unknown
    if group_a is None or group_b is None:
        return OTHER_SCORE
    
    # Order groups so lookup works both ways
    key = (group_a, group_b)
    reverse_key = (group_b, group_a)
    
    return GROUP_SIMILARITY.get(key, GROUP_SIMILARITY.get(reverse_key, 0.0))


def composite_assignment_similarity(target_class_type, target_assignment_type, target_class_id,
                                   past_class_type, past_assignment_type, past_class_id):
    """
    Composite similarity score combining multiple factors.
    Returns weighted similarity in [0, 1].
    """
    class_sim = class_type_similarity(target_class_type, past_class_type)
    type_sim = assignment_type_similarity(target_assignment_type, past_assignment_type)
    same_class_bonus = 1.0 if target_class_id == past_class_id else 0.6
    
    return round(
        0.5 * class_sim +
        0.3 * type_sim +
        0.2 * same_class_bonus,
        3
    )


# =================== ESTIMATION FUNCTIONS ===================

def estimate_expected_minutes(target_class_type, target_assignment_type, target_class_id,
                              past_assignments):
    """
    Estimate expected minutes for an assignment.
    
    past_assignments: list of dicts with keys:
        - class_type
        - assignment_type
        - class_id
        - actual_minutes (duration spent)
    """
    base = BASE_TIME_BY_ASSIGNMENT_TYPE.get(target_assignment_type, 120)
    
    if not has_enough_data(past_assignments):
        return base
    
    weighted_sum = 0
    weight_total = 0
    
    for past in past_assignments:
        if past.get('actual_minutes') is None:
            continue
        
        w = composite_assignment_similarity(
            target_class_type, target_assignment_type, target_class_id,
            past['class_type'], past['assignment_type'], past['class_id']
        )
        
        weighted_sum += w * past['actual_minutes']
        weight_total += w
    
    if weight_total == 0:
        return base
    
    historical_estimate = weighted_sum / weight_total
    
    alpha = 0.35  # trust base when data is noisy
    return round(alpha * base + (1 - alpha) * historical_estimate)


def estimate_expected_difficulty(target_class_type, target_assignment_type, target_class_id,
                                 past_assignments):
    """
    Estimate expected difficulty (1-10) for an assignment.
    
    past_assignments: list of dicts with keys:
        - class_type
        - assignment_type
        - class_id
        - difficulty
    """
    base = BASE_DIFFICULTY_BY_ASSIGNMENT_TYPE.get(target_assignment_type, 5)
    
    if not has_enough_data(past_assignments):
        return base
    
    weighted_sum = 0
    weight_total = 0
    
    for past in past_assignments:
        if past.get('difficulty') is None:
            continue
        
        w = composite_assignment_similarity(
            target_class_type, target_assignment_type, target_class_id,
            past['class_type'], past['assignment_type'], past['class_id']
        )
        
        weighted_sum += w * past['difficulty']
        weight_total += w
    
    if weight_total == 0:
        return base
    
    estimate = weighted_sum / weight_total
    
    alpha = 0.4
    final = alpha * base + (1 - alpha) * estimate
    
    return int(round(min(10, max(1, final))))