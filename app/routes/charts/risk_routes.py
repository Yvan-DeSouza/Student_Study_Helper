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

from app.services.risk_utils import (
    compute_days_until_due,
    urgency_score,
    deadline_proximity_bucket,
    min_max_normalize,
    time_pressure_score,
    compute_workload_overlap,
    historical_risk,
    compute_assignment_risk,
    aggregate_weekly_risk_components
)


# =================== GRAPH 1: Deadline Proximity Distribution ===================
@charts.route("/dashboard/deadline_proximity_distribution")
@login_required
def deadline_proximity_distribution():
    """
    Shows how compressed upcoming deadlines are.
    Pure urgency, no risk modeling.
    """
    
    now = datetime.now(timezone.utc)
    
    # Get incomplete assignments with due dates
    results = db.session.query(
        Assignment.assignment_id,
        Assignment.title,
        Assignment.due_at,
        Assignment.estimated_minutes,
        Class.class_name
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == False,
        Assignment.due_at.isnot(None)
    ).all()
    
    if not results:
        return jsonify({"empty": True, "message": "No upcoming assignments with deadlines"})
    
    # Compute days until due and bucket
    buckets = {
        "Overdue": {"count": 0, "minutes": 0},
        "0-2 days": {"count": 0, "minutes": 0},
        "3-5 days": {"count": 0, "minutes": 0},
        "6-10 days": {"count": 0, "minutes": 0},
        "10+ days": {"count": 0, "minutes": 0}
    }
    
    for r in results:
        days_until = compute_days_until_due(r.due_at, now)
        bucket = deadline_proximity_bucket(days_until)
        
        if bucket:
            buckets[bucket]["count"] += 1
            buckets[bucket]["minutes"] += r.estimated_minutes or 60  # Default 60 min
    
    # Prepare data in fixed order
    bucket_order = ["Overdue", "0-2 days", "3-5 days", "6-10 days", "10+ days"]
    
    labels = bucket_order
    counts = [buckets[b]["count"] for b in bucket_order]
    minutes = [buckets[b]["minutes"] for b in bucket_order]
    
    return jsonify({
        "empty": False,
        "labels": labels,
        "counts": counts,
        "minutes": minutes
    })


# =================== GRAPH 2: Risk Composition Evolution ===================
@charts.route("/dashboard/risk_composition_evolution")
@login_required
def risk_composition_evolution():
    """
    Stacked area chart showing why risk is rising over time.
    Components: time_pressure, difficulty, overlap, history
    """
    
    now = datetime.now(timezone.utc)
    
    # Get all assignments (for historical context)
    results = db.session.query(
        Assignment.assignment_id,
        Assignment.title,
        Assignment.class_id,
        Assignment.created_at,
        Assignment.due_at,
        Assignment.difficulty,
        Assignment.estimated_minutes,
        Assignment.is_completed,
        Assignment.grade,
        Class.class_name
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id
    ).order_by(Assignment.created_at).all()
    
    if not results:
        return jsonify({"empty": True, "message": "No assignments yet"})
    
    df = pd.DataFrame([{
        'assignment_id': r.assignment_id,
        'title': r.title,
        'class_id': r.class_id,
        'created_at': r.created_at,
        'due_at': r.due_at,
        'difficulty': r.difficulty or 3,  # Default medium
        'estimated_minutes': r.estimated_minutes or 60,
        'is_completed': r.is_completed,
        'grade': float(r.grade) if r.grade else None
    } for r in results])
    
    # Normalize timezone
    df['created_at'] = pd.to_datetime(df['created_at'], utc=True)
    df['due_at'] = pd.to_datetime(df['due_at'], utc=True)
    
    # Bucket by week (using created_at for temporal alignment)
    df['week'] = df['created_at'].dt.to_period('W').apply(lambda x: x.start_time)
    
    # Compute components per assignment
    df['days_until_due'] = df['due_at'].apply(lambda x: compute_days_until_due(x, now))
    df['time_pressure'] = df['days_until_due'].apply(lambda x: time_pressure_score(x, tau=7))
    
    # Difficulty (normalize)
    df['difficulty_norm'] = min_max_normalize(df['difficulty'])
    
    # Overlap: count active assignments per day
    # For simplicity, use weekly active count
    weekly_active = []
    for week in sorted(df['week'].unique()):
        week_data = df[df['week'] == week]
        active_count = len(week_data[week_data['is_completed'] == False])
        weekly_active.append({'week': week, 'active_count': active_count})
    
    active_df = pd.DataFrame(weekly_active)
    max_active = active_df['active_count'].max() if not active_df.empty else 1
    
    df = df.merge(active_df, on='week', how='left')
    df['overlap'] = df['active_count'].apply(lambda x: compute_workload_overlap(x, max_active))
    
    # History: use rolling grade average (if available)
    # Compute rolling average grade per week
    graded = df[df['grade'].notna()].copy()
    if not graded.empty:
        weekly_grades = graded.groupby('week')['grade'].mean()
        df = df.merge(
            weekly_grades.to_frame('avg_grade').reset_index(),
            on='week',
            how='left'
        )
        df['history'] = df['avg_grade'].apply(lambda x: historical_risk(x))
    else:
        df['history'] = 0.0
    
    # Aggregate by week
    weekly_risk = aggregate_weekly_risk_components(
        df[['week', 'time_pressure', 'difficulty_norm', 'overlap', 'history']].rename(
            columns={'difficulty_norm': 'difficulty'}
        )
    )
    
    if weekly_risk.empty:
        return jsonify({"empty": True, "message": "Insufficient data"})
    
    weekly_risk = weekly_risk.sort_values('week')
    
    # Apply weights for stacking
    weights = {
        'time_pressure': 0.35,
        'difficulty': 0.25,
        'overlap': 0.20,
        'history': 0.20
    }
    # Apply weights post-aggregation to preserve interpretability
    for component, weight in weights.items():
        if component in weekly_risk.columns:
            weekly_risk[component] *= weight


    
    # Prepare datasets
    weeks = [w.isoformat() for w in weekly_risk['week']]
    
    datasets = []
    colors = {
        'time_pressure': 'rgba(239, 68, 68, 0.7)',   # Red
        'difficulty': 'rgba(245, 158, 11, 0.7)',     # Orange
        'overlap': 'rgba(59, 130, 246, 0.7)',         # Blue
        'history': 'rgba(139, 92, 246, 0.7)'          # Purple
    }
    
    labels = {
        'time_pressure': 'Time Pressure',
        'difficulty': 'Difficulty',
        'overlap': 'Workload Overlap',
        'history': 'Historical Risk'
    }
    
    for component in ['history', 'overlap', 'difficulty', 'time_pressure']:  # Bottom to top
        if component in weekly_risk.columns:
            datasets.append({
                'label': labels[component],
                'data': [
                    {'x': weeks[i], 'y': round(weekly_risk[component].iloc[i], 3)}
                    for i in range(len(weeks))
                ],
                'backgroundColor': colors[component],
                'borderColor': colors[component].replace('0.7', '1.0'),
                'borderWidth': 1
            })
    
    return jsonify({
        "empty": False,
        "datasets": datasets
    })


# =================== GRAPH 3: Assignment Risk Breakdown ===================
@charts.route("/dashboard/assignment_risk_breakdown")
@login_required
def assignment_risk_breakdown():
    """
    Horizontal stacked bars showing risk breakdown per assignment.
    Allows filtering by top N riskiest or latest N.
    """
    
    mode = request.args.get('mode', 'riskiest')  # 'riskiest' or 'latest'
    limit = int(request.args.get('limit', 10))
    
    now = datetime.now(timezone.utc)
    
    # Get incomplete assignments
    results = db.session.query(
        Assignment.assignment_id,
        Assignment.title,
        Assignment.class_id,
        Assignment.created_at,
        Assignment.due_at,
        Assignment.difficulty,
        Assignment.estimated_minutes,
        Assignment.grade,
        Class.class_name,
        Class.color
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == False
    ).all()
    
    if not results:
        return jsonify({"empty": True, "message": "No incomplete assignments"})
    
    df = pd.DataFrame([{
        'assignment_id': r.assignment_id,
        'title': r.title,
        'class_name': r.class_name,
        'color': r.color,
        'created_at': r.created_at,
        'due_at': r.due_at,
        'difficulty': r.difficulty or 3,
        'estimated_minutes': r.estimated_minutes or 60,
        'grade': float(r.grade) if r.grade else None
    } for r in results])
    
    # Compute risk components
    df['days_until_due'] = df['due_at'].apply(lambda x: compute_days_until_due(x, now))
    df['time_pressure'] = df['days_until_due'].apply(lambda x: time_pressure_score(x, tau=7))
    df['deadline_proximity'] = df['days_until_due'].apply(lambda x: urgency_score(x, tau=7))
    df['difficulty_norm'] = min_max_normalize(df['difficulty'].astype(float))

    
    # Overlap (system-wide)
    df['overlap'] = df['estimated_minutes'] / df['estimated_minutes'].max()
    df['overlap'] = df['overlap'].clip(0, 1)

    
    # History (use previous grades if available)
    # For simplicity, use global average or 0
    if df['grade'].notna().any():
        df['history'] = df['grade'].apply(lambda g: historical_risk(g) if pd.notna(g) else 0.0)
    else:
        df['history'] = 0.0
    
    # Compute total risk
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
    
    # Sort and filter
    if mode == 'riskiest':
        df = df.sort_values('total_risk', ascending=False).head(limit)
    else:  # latest
        df = df.sort_values('created_at', ascending=False).head(limit)
    
    # Prepare data
    labels = df['title'].tolist()
    colors_list = df['color'].tolist()
    
    # Extract breakdown components
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
            'data': [row['breakdown'][key] for _, row in df.iterrows()],
            'backgroundColor': component_colors[key]
        })
    
    return jsonify({
        "empty": False,
        "labels": labels,
        "datasets": datasets,
        "assignment_colors": colors_list
    })


# =================== GRAPH 4: Urgency vs Risk Matrix ===================
@charts.route("/dashboard/urgency_risk_matrix")
@login_required
def urgency_risk_matrix():
    """
    Scatter plot: X = urgency, Y = risk, bubble size = workload
    """
    
    now = datetime.now(timezone.utc)
    
    # Get incomplete assignments
    results = db.session.query(
        Assignment.assignment_id,
        Assignment.title,
        Assignment.class_id,
        Assignment.created_at,
        Assignment.due_at,
        Assignment.difficulty,
        Assignment.estimated_minutes,
        Assignment.grade,
        Class.class_name,
        Class.color
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.is_completed == False
    ).all()
    
    if not results:
        return jsonify({"empty": True, "message": "No incomplete assignments"})
    
    df = pd.DataFrame([{
        'assignment_id': r.assignment_id,
        'title': r.title,
        'class_name': r.class_name,
        'color': r.color,
        'due_at': r.due_at,
        'difficulty': r.difficulty or 3,
        'estimated_minutes': r.estimated_minutes or 60,
        'grade': float(r.grade) if r.grade else None
    } for r in results])
    
    # Compute urgency and risk
    df['days_until_due'] = df['due_at'].apply(lambda x: compute_days_until_due(x, now))
    df['urgency'] = df['days_until_due'].apply(lambda x: urgency_score(x, tau=7))
    
    # Risk components
    df['time_pressure'] = df['days_until_due'].apply(lambda x: time_pressure_score(x, tau=7))
    df['deadline_proximity'] = df['urgency']
    df['difficulty_norm'] = min_max_normalize(df['difficulty'])
    
    max_active = len(df)
    overlap_score = compute_workload_overlap(len(df), max_active)
    df['overlap'] = overlap_score
    
    if df['grade'].notna().any():
        avg_grade = df['grade'].mean()
        df['history'] = historical_risk(avg_grade)
    else:
        df['history'] = 0.0
    
    df['risk_components'] = df.apply(lambda row: {
        'time_pressure': row['time_pressure'],
        'deadline_proximity': row['deadline_proximity'],
        'difficulty': row['difficulty_norm'],
        'overlap': row['overlap'],
        'history': row['history']
    }, axis=1)
    
    df['risk_result'] = df['risk_components'].apply(compute_assignment_risk)
    df['total_risk'] = df['risk_result'].apply(lambda x: x['total_risk'])
    
    # Bubble size (remaining work)
    df['bubble_size'] = df['estimated_minutes'].apply(lambda x: max(5, min(20, x / 10)))
    
    # Prepare scatter data
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
        "empty": False,
        "data": data
    })