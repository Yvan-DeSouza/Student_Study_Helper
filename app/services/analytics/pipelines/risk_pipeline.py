import pandas as pd
from datetime import datetime, timezone

from app.services.analytics.computation.risk import (
    compute_days_until_due,
    urgency_score,
    time_pressure_score,
    normalize_1_to_10,
    historical_risk_from_history,
    compute_assignment_risk
)

from app.services.analytics.computation.global_workload import (
    ensure_global_workload_stats
)

from app.services.analytics.computation.workload import (
    compute_assignment_overlap_global
)

from app.services.analytics.computation.expected import (
    estimate_expected_minutes,
    estimate_expected_difficulty
)


def build_assignment_dataframe(results, past_assignments):
    """
    Convert SQL results into standardized assignment dataframe.
    This removes ~120 duplicated lines across routes.
    """

    rows = []

    for r in results:
        rows.append({
            "assignment_id": r.assignment_id,
            "title": getattr(r, "title", None),
            "class_name": getattr(r, "class_name", None),
            "color": getattr(r, "color", None),
            "class_id": r.class_id,
            "class_type": r.class_type,
            "assignment_type": r.assignment_type,
            "created_at": getattr(r, "created_at", None),
            "due_at": r.due_at,
            "difficulty": (
                r.difficulty
                if r.difficulty is not None
                else estimate_expected_difficulty(
                    r.class_type,
                    r.assignment_type,
                    r.class_id,
                    past_assignments
                )
            ),
            "estimated_minutes": (
                r.estimated_minutes
                if r.estimated_minutes is not None
                else estimate_expected_minutes(
                    r.class_type,
                    r.assignment_type,
                    r.class_id,
                    past_assignments
                )
            ),
            "is_completed": getattr(r, "is_completed", None),
            "grade": float(r.grade) if getattr(r, "grade", None) else None
        })

    return pd.DataFrame(rows)


def compute_assignment_risk_pipeline(df, now, past_risk_assignments):
    """
    Full risk computation pipeline used by multiple charts.
    """

    df["days_until_due"] = df["due_at"].apply(
        lambda x: compute_days_until_due(x, now) if x else None
    )

    df["urgency"] = df["days_until_due"].apply(
        lambda x: urgency_score(x, tau=7) if x else 0
    )

    df["time_pressure"] = df["days_until_due"].apply(
        lambda x: time_pressure_score(x, tau=7) if x else 0
    )

    df["deadline_proximity"] = df["urgency"]

    df["difficulty_norm"] = normalize_1_to_10(df["difficulty"])

    context = {}
    all_assignments = df.to_dict("records")

    ensure_global_workload_stats(
        context=context,
        all_assignments=all_assignments,
        now=now
    )

    df["overlap"] = df.apply(
        lambda row: compute_assignment_overlap_global(
            target_assignment=row.to_dict(),
            all_assignments=all_assignments,
            context=context,
            now=now
        ),
        axis=1
    )

    df["history"] = df.apply(
        lambda row: historical_risk_from_history(
            row["class_type"],
            row["assignment_type"],
            row["class_id"],
            past_risk_assignments
        ),
        axis=1
    )

    df["risk_components"] = df.apply(
        lambda row: {
            "time_pressure": row["time_pressure"],
            "deadline_proximity": row["deadline_proximity"],
            "difficulty": row["difficulty_norm"],
            "overlap": row["overlap"],
            "history": row["history"],
        },
        axis=1
    )

    df["risk_result"] = df["risk_components"].apply(compute_assignment_risk)

    df["total_risk"] = df["risk_result"].apply(lambda x: x["total_risk"])
    df["breakdown"] = df["risk_result"].apply(lambda x: x["breakdown"])

    return df