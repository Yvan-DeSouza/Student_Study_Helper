from flask import jsonify, request
from flask_login import login_required, current_user
from app.routes.charts import charts
from app.models.course import Class
from app.models.study_session import StudySession
from app.models.assignment import Assignment
from app.extensions import db
from sqlalchemy import func
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta
from app.services.analytics.config.risk import RISK_CONFIG


from app.services.analytics.computation.risk import (
    compute_days_until_due,
    urgency_score,
    deadline_proximity_bucket,
    time_pressure_score,
    compute_workload_overlap,
    historical_risk_from_history,
    compute_assignment_risk,
    aggregate_weekly_risk_components,
    normalize_1_to_10
)
from app.services.analytics.computation.expected import (
    estimate_expected_minutes,
    estimate_expected_difficulty
)
from app.services.analytics.chart_eligibility.risk.risk_eligibility import (
    get_deadline_proximity_eligibility,
    get_risk_composition_eligibility,
    get_assignment_risk_breakdown_eligibility,
    get_urgency_risk_matrix_eligibility
)


def build_past_assignments(user_id):
    """
    Build historical assignment data for estimation.
    """
    rows = (
        db.session.query(
            Assignment.assignment_id,
            Assignment.class_id,
            Assignment.assignment_type,
            Assignment.difficulty,
            Class.class_type,
            func.sum(StudySession.duration_minutes).label("actual_minutes")
        )
        .join(Class, Class.class_id == Assignment.class_id)
        .join(StudySession, StudySession.assignment_id == Assignment.assignment_id)
        .filter(
            Assignment.user_id == user_id,
            Assignment.is_completed == True,
            StudySession.duration_minutes.isnot(None)
        )
        .group_by(
            Assignment.assignment_id,
            Assignment.class_id,
            Assignment.assignment_type,
            Assignment.difficulty,
            Class.class_type
        )
        .all()
    )


    return [
        {
            "class_type": r.class_type,
            "assignment_type": r.assignment_type,
            "class_id": r.class_id,
            "actual_minutes": r.actual_minutes,
            "difficulty": r.difficulty
        }
        for r in rows
        if r.actual_minutes is not None
    ]

def build_past_risk_assignments(user_id):
    """
    Build historical assignment data for performance-based risk modeling.
    """
    rows = (
        db.session.query(
            Assignment.assignment_id,
            Assignment.class_id,
            Assignment.assignment_type,
            Assignment.grade,
            Class.class_type
        )
        .join(Class, Class.class_id == Assignment.class_id)
        .filter(
            Assignment.user_id == user_id,
            Assignment.is_completed == True,
            Assignment.grade.isnot(None)
        )
        .all()
    )

    return [
        {
            "class_type": r.class_type,
            "assignment_type": r.assignment_type,
            "class_id": r.class_id,
            "grade": float(r.grade)
        }
        for r in rows
    ]


# =================== GRAPH 1: Deadline Proximity Distribution ===================
@charts.route("/dashboard/deadline_proximity_distribution")
@login_required
def deadline_proximity_distribution():

    eligibility = get_deadline_proximity_eligibility(current_user.user_id)
    now = datetime.now(timezone.utc)

    # Get incomplete assignments with due dates
    results = db.session.query(
        Assignment.assignment_id,
        Assignment.title,
        Assignment.due_at,
        Assignment.estimated_minutes,
        Class.class_name,
        Assignment.assignment_type,
        Class.class_type
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == False,
        Assignment.due_at.isnot(None)
    ).all()

    buckets = {label: {"count": 0, "minutes": 0} for label in RISK_CONFIG.BUCKETS.keys()}
    bucket_order = list(RISK_CONFIG.BUCKETS.keys())


    past_assignments = build_past_assignments(current_user.user_id)

    for r in results:
        days_until = compute_days_until_due(r.due_at, now)
        bucket = deadline_proximity_bucket(days_until)
        if not bucket:
            continue

        minutes = r.estimated_minutes or estimate_expected_minutes(
            r.class_type, r.assignment_type, r.assignment_id, past_assignments
        )

        buckets[bucket]["count"] += 1
        buckets[bucket]["minutes"] += minutes

    bucket_order = ["Overdue", "0-2 days", "3-5 days", "6-10 days", "10+ days"]
    labels = bucket_order
    counts = [buckets[b]["count"] for b in bucket_order]
    minutes = [buckets[b]["minutes"] for b in bucket_order]

    return jsonify({
        "eligible": eligibility["eligible"],
        "eligibility": eligibility,
        "empty": not bool(results),
        "labels": labels,
        "counts": counts,
        "minutes": minutes
    })


# =================== GRAPH 2: Risk Composition Evolution ===================
@charts.route("/dashboard/risk_composition_evolution")
@login_required
def risk_composition_evolution():
    eligibility = get_risk_composition_eligibility(current_user.user_id)
    now = datetime.now(timezone.utc)

    results = db.session.query(
        Assignment.assignment_id,
        Assignment.assignment_type,
        Assignment.title,
        Assignment.class_id,
        Assignment.created_at,
        Assignment.due_at,
        Assignment.difficulty,
        Assignment.estimated_minutes,
        Assignment.is_completed,
        Assignment.grade,
        Class.class_name,
        Class.class_type
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id
    ).order_by(Assignment.created_at).all()
    
    past_assignments = build_past_assignments(current_user.user_id)
    if not results:
        return jsonify({
            "eligible": eligibility["eligible"],
            "eligibility": eligibility,
            "empty": True,
            "message": "No assignments yet"
        })


    df = pd.DataFrame([{
        'assignment_id': r.assignment_id,
        'title': r.title,
        'class_id': r.class_id,
        'created_at': r.created_at,
        'class_type': r.class_type,
        'assignment_type': r.assignment_type,
        'due_at': r.due_at,
        'difficulty': (
            r.difficulty if r.difficulty is not None else
            estimate_expected_difficulty(
                r.class_type,
                r.assignment_type,
                r.class_id,
                past_assignments
            )
        ),
        'estimated_minutes': (
            r.estimated_minutes if r.estimated_minutes is not None else
            estimate_expected_minutes(
                r.class_type,
                r.assignment_type,
                r.class_id,
                past_assignments
            )
        ),
        'is_completed': r.is_completed,
        'grade': float(r.grade) if r.grade else None
    } for r in results])
    past_risk_assignments = build_past_risk_assignments(current_user.user_id)

    df['created_at'] = pd.to_datetime(df['created_at'], utc=True)
    df['week'] = df['created_at'].dt.to_period('W').apply(lambda x: x.start_time)
    df['days_until_due'] = df['due_at'].apply(lambda x: compute_days_until_due(x, now) if x else None)
    df['time_pressure'] = df['days_until_due'].apply(lambda x: time_pressure_score(x, tau=7) if x else 0)
    df['difficulty_norm'] = normalize_1_to_10(df['difficulty'])
    weekly_active = (
        df.groupby('week')
        .apply(lambda w: len(w[w['is_completed'] == False]))
        .to_dict()
    )
    max_active = max(weekly_active.values()) if weekly_active and max(weekly_active.values()) > 0 else 1
    df['overlap'] = (
        df['week']
        .map(weekly_active)
        .fillna(0)
        .apply(lambda x: compute_workload_overlap(x, max_active))
    )
    df['history'] = df.apply(lambda row: historical_risk_from_history(row['class_type'], row['assignment_type'], row['class_id'], past_risk_assignments), axis=1)
    weekly_risk = aggregate_weekly_risk_components(df[['week', 'time_pressure', 'difficulty_norm', 'overlap', 'history']].rename(columns={'difficulty_norm': 'difficulty'}))
    weekly_risk = weekly_risk.sort_values('week')

    # Apply weights
    weights = {'time_pressure': 0.35, 'difficulty': 0.25, 'overlap': 0.2, 'history': 0.2}
    for component, weight in weights.items():
        if component in weekly_risk.columns:
            weekly_risk[component] *= weight

        weekly_risk = weekly_risk.fillna(0.0)


    weeks = [w.isoformat() for w in weekly_risk['week']]
    datasets = []
    colors = {'time_pressure': 'rgba(239, 68, 68, 0.7)', 'difficulty': 'rgba(245, 158, 11, 0.7)',
              'overlap': 'rgba(59, 130, 246, 0.7)', 'history': 'rgba(139, 92, 246, 0.7)'}
    labels_map = {'time_pressure': 'Time Pressure', 'difficulty': 'Difficulty', 'overlap': 'Workload Overlap', 'history': 'Historical Risk'}

    for comp in ['history', 'overlap', 'difficulty', 'time_pressure']:
        datasets.append({
            'label': labels_map[comp],
            'data': [{'x': weeks[i], 'y': round(weekly_risk[comp].iloc[i], 3)} for i in range(len(weeks))],
            'backgroundColor': colors[comp],
            'borderColor': colors[comp].replace('0.7', '1.0'),
            'borderWidth': 1
        })

    return jsonify({
        "eligible": eligibility["eligible"],
        "eligibility": eligibility,
        "empty": False,
        "datasets": datasets
    })


# =================== GRAPH 3: Assignment Risk Breakdown ===================
@charts.route("/dashboard/assignment_risk_breakdown")
@login_required
def assignment_risk_breakdown():
    eligibility = get_assignment_risk_breakdown_eligibility(current_user.user_id)
    now = datetime.now(timezone.utc)
    mode = request.args.get('mode', 'riskiest')
    limit = int(request.args.get('limit', 10))

    results = db.session.query(
        Assignment.assignment_id,
        Assignment.title,
        Assignment.class_id,
        Assignment.created_at,
        Assignment.due_at,
        Assignment.difficulty,
        Assignment.estimated_minutes,
        Assignment.grade,
        Assignment.assignment_type,
        Class.class_name,
        Class.color,
        Class.class_type
    ).join(Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == False,
        Assignment.due_at.isnot(None)
    ).all()

    if not results:
        return jsonify({
            "eligible": eligibility["eligible"],
            "eligibility": eligibility,
            "empty": True,
            "message": "No incomplete assignments"
        })

    past_assignments = build_past_assignments(current_user.user_id)

    df = pd.DataFrame([{
        'assignment_id': r.assignment_id,
        'title': r.title,
        'class_name': r.class_name,
        'color': r.color,
        'class_id': r.class_id,
        'class_type': r.class_type,
        'assignment_type': r.assignment_type,
        'created_at': r.created_at,
        'due_at': r.due_at,
        'difficulty': (
            r.difficulty if r.difficulty is not None else
            estimate_expected_difficulty(
                r.class_type,
                r.assignment_type,
                r.class_id,
                past_assignments
            )
        ),
        'estimated_minutes': (
            r.estimated_minutes if r.estimated_minutes is not None else
            estimate_expected_minutes(
                r.class_type,
                r.assignment_type,
                r.class_id,
                past_assignments
            )
        ),

        'grade': float(r.grade) if r.grade else None
    } for r in results])


    df['days_until_due'] = df['due_at'].apply(lambda x: compute_days_until_due(x, now) if x else None)
    df['time_pressure'] = df['days_until_due'].apply(lambda x: time_pressure_score(x, tau=7) if x else 0)
    df['deadline_proximity'] = df['days_until_due'].apply(lambda x: urgency_score(x, tau=7) if x else 0)
    df['difficulty_norm'] = normalize_1_to_10(df['difficulty'])
    max_minutes = df['estimated_minutes'].max()
    print(df['difficulty_norm'])
    print(df['class_name'])

    if max_minutes and max_minutes > 0:
        df['overlap'] = df['estimated_minutes'] / max_minutes
    else:
        # No meaningful workload comparison possible
        df['overlap'] = 0.0

    df['overlap'] = df['overlap'].fillna(0.0).clip(0, 1)

    past_risk_assignments = build_past_risk_assignments(current_user.user_id)
    df['history'] = df.apply(
        lambda row: historical_risk_from_history(
            row['class_type'],
            row['assignment_type'],
            row['class_id'],
            past_risk_assignments
        ),
        axis=1
    )

    df['risk_components'] = df.apply(lambda row: {
        'time_pressure': row['time_pressure'],
        'deadline_proximity': row['deadline_proximity'],
        'difficulty': row['difficulty_norm'],
        'overlap': row['overlap'],
        'history': row['history']
    }, axis=1)

    df['risk_result'] = df['risk_components'].apply(compute_assignment_risk)
    df['total_risk'] = df['risk_result'].apply(lambda x: x['total_risk'])
    df['breakdown'] = df['risk_result'].apply(lambda x: x['breakdown'])

    if mode == 'riskiest':
        df = df.sort_values('total_risk', ascending=False).head(limit)
    else:
        df = df.sort_values('created_at', ascending=False).head(limit)

    labels = df['title'].tolist()
    colors_list = df['color'].tolist()
    component_keys = ['time_pressure', 'deadline_proximity', 'difficulty', 'history', 'overlap']
    component_labels = {
        'time_pressure': 'Time Pressure',
        'deadline_proximity': 'Deadline Proximity',
        'difficulty': 'Difficulty',
        'history': 'Historical Risk',
        'overlap': 'Workload Overlap'
    }
    component_colors = {
        'time_pressure': '#ef4444',
        'deadline_proximity': '#f97316',
        'difficulty': '#f59e0b',
        'history': '#8b5cf6',
        'overlap': '#3b82f6'
    }

    datasets = []
    for key in component_keys:
        datasets.append({
            'label': component_labels[key],
            'data': [
                float(row['breakdown'].get(key, 0.0)) if np.isfinite(row['breakdown'].get(key, 0.0)) else 0.0
                for _, row in df.iterrows()
            ],
            'backgroundColor': component_colors[key]
        })


    return jsonify({
        "eligible": eligibility["eligible"],
        "eligibility": eligibility,
        "empty": False,
        "labels": labels,
        "datasets": datasets,
        "assignment_colors": colors_list
    })

# =================== GRAPH 4: Urgency vs Risk Matrix ===================
@charts.route("/dashboard/urgency_risk_matrix")
@login_required
def urgency_risk_matrix():
    eligibility = get_urgency_risk_matrix_eligibility(current_user.user_id)
    now = datetime.now(timezone.utc)

    results = db.session.query(
        Assignment.assignment_id,
        Assignment.title,
        Assignment.class_id,
        Assignment.created_at,
        Assignment.due_at,
        Assignment.difficulty,
        Assignment.estimated_minutes,
        Assignment.grade,
        Assignment.assignment_type,
        Class.class_name,
        Class.color,
        Class.class_type
    ).join(Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == False,
        Assignment.due_at.isnot(None)
    ).all()


    if not results:
        return jsonify({
            "eligible": eligibility["eligible"],
            "eligibility": eligibility,
            "empty": True,
            "message": "No incomplete assignments"
        })
    
    past_assignments = build_past_assignments(current_user.user_id)

    df = pd.DataFrame([{
        'assignment_id': r.assignment_id,
        'title': r.title,
        'class_type': r.class_type,
        'class_name': r.class_name,
        'class_id': r.class_id,
        'assignment_type': r.assignment_type,
        'color': r.color,
        'created_at': r.created_at,
        'due_at': r.due_at,
        'difficulty': (
            r.difficulty if r.difficulty is not None else
            estimate_expected_difficulty(
                r.class_type,
                r.assignment_type,
                r.class_id,
                past_assignments
            )
        ),
        'estimated_minutes': (
            r.estimated_minutes if r.estimated_minutes is not None else
            estimate_expected_minutes(
                r.class_type,
                r.assignment_type,
                r.class_id,
                past_assignments
            )
        ),

        'grade': float(r.grade) if r.grade else None
    } for r in results])

    df['days_until_due'] = df['due_at'].apply(lambda x: compute_days_until_due(x, now) if x else None)
    df['urgency'] = df['days_until_due'].apply(lambda x: urgency_score(x, tau=7) if x else 0)
    df['time_pressure'] = df['days_until_due'].apply(lambda x: time_pressure_score(x, tau=7) if x else 0)
    df['deadline_proximity'] = df['urgency']
    df['difficulty_norm'] = normalize_1_to_10(df['difficulty'])
    df['overlap'] = compute_workload_overlap(len(df), len(df)) if len(df) else 0
    past_risk_assignments = build_past_risk_assignments(current_user.user_id)
    
    df['history'] = df.apply(
        lambda row: historical_risk_from_history(
            row['class_type'],
            row['assignment_type'],
            row['class_id'],
            past_risk_assignments
        ),
        axis=1
    )

    df['risk_components'] = df.apply(lambda row: {
        'time_pressure': row['time_pressure'],
        'deadline_proximity': row['deadline_proximity'],
        'difficulty': row['difficulty_norm'],
        'overlap': row['overlap'],
        'history': row['history']
    }, axis=1)
    df['risk_result'] = df['risk_components'].apply(compute_assignment_risk)
    df['total_risk'] = df['risk_result'].apply(lambda x: x['total_risk'])
    df['bubble_size'] = df['estimated_minutes'].apply(lambda x: max(5, min(20, x / 10)))

    data = []
    for _, row in df.iterrows():
        data.append({
            'x': round(row['urgency'], 3),
            'y': round(row['total_risk'], 3),
            'r': row['bubble_size'],
            'label': row['title'],
            'class_name': row['class_name'],
            'backgroundColor': row['color'],
            'estimated_minutes': row['estimated_minutes']
        })



    return jsonify({
        "eligible": eligibility["eligible"],
        "eligibility": eligibility,
        "empty": False,
        "data": data
    })
