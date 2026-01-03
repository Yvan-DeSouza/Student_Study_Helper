from flask import jsonify, request
from flask_login import login_required, current_user
from app.routes.charts import charts
from app.models.course import Class
from app.models.study_session import StudySession
from app.models.assignment import Assignment
from app.extensions import db
import pandas as pd


# =================== GRAPH 1: Rolling Grade Trend ===================
@charts.route("/dashboard/rolling_grade_trend")
@login_required
def rolling_grade_trend():
    """
    Rolling average of grades over time (weekly buckets).
    Smooths out performance trajectory per class.
    """
   
    # Query all graded assignments
    results = db.session.query(
        Assignment.class_id,
        Assignment.finished_at,
        Assignment.grade,
        Class.class_name,
        Class.color
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.grade.isnot(None),
        Assignment.finished_at.isnot(None)
    ).order_by(Assignment.finished_at).all()
   
    if not results:
        return jsonify({"empty": True, "message": "No graded assignments yet"})
   
    # Convert to DataFrame
    df = pd.DataFrame([{
        'class_id': r.class_id,
        'class_name': r.class_name,
        'color': r.color,
        'finished_at': r.finished_at,
        'grade': float(r.grade)
    } for r in results])
   


    # ✅ Normalize timezone
    df['finished_at'] = pd.to_datetime(df['finished_at'], utc=True)

    # ✅ Weekly buckets
    df['week'] = (
        df['finished_at']
        .dt.to_period('W')
        .apply(lambda p: p.start_time)
    )

    # Weekly average
    weekly = (
        df
        .groupby(['class_id', 'class_name', 'color', 'week'])['grade']
        .mean()
        .reset_index()
        .sort_values(['class_id', 'week'])
    )

    # Rolling average
    weekly['rolling_grade'] = (
        weekly
        .groupby('class_id')['grade']
        .rolling(window=4, min_periods=2)
        .mean()
        .reset_index(level=0, drop=True)
    )

    weekly = weekly.dropna(subset=['rolling_grade'])

   
    # Compute rolling average (window=4 weeks, min_periods=2)
    datasets = []
   
    for class_id in weekly['class_id'].unique():
        class_data = weekly[weekly['class_id'] == class_id].copy()
        class_data = class_data.sort_values('week')
       
       

       
        if len(class_data) == 0:
            continue
        if class_data.shape[0] < 2:
            continue
       
        class_name = class_data.iloc[0]['class_name']
        color = class_data.iloc[0]['color']



       
        datasets.append({
            'label': class_name,
            'data': [
                {'x': row['week'].isoformat(), 'y': round(row['rolling_grade'], 1)}
                for _, row in class_data.iterrows()
            ],
            'borderColor': color,
            'backgroundColor': color,
            'tension': 0.4
        })
   
    # Global average across all classes
    global_weekly = (
        weekly
        .groupby('week')['grade']
        .mean()
        .reset_index()
    )

    global_weekly = global_weekly.sort_values('week')
    global_weekly['rolling_grade'] = global_weekly['grade'].rolling(
        window=4, min_periods=2
    ).mean()
    global_weekly = global_weekly.dropna(subset=['rolling_grade'])
   
    if len(global_weekly) > 0:
        datasets.append({
            'label': 'Overall Average',
            'data': [
                {'x': row['week'].isoformat(), 'y': round(row['rolling_grade'], 1)}
                for _, row in global_weekly.iterrows()
            ],
            'borderColor': "#000000",
            'backgroundColor': "#000000",
            'borderWidth': 3,
            'borderDash': [5, 5],
            'tension': 0.4
        })
   
   # ------------------- Y-axis bounds -------------------
    all_y_values = []

    for ds in datasets:
        for point in ds['data']:
            all_y_values.append(point['y'])

    if all_y_values:
        y_min = max(0, min(all_y_values) - 3)   # padding
        y_max = min(100, max(all_y_values) + 3)
    else:
        y_min, y_max = 0, 100

    return jsonify({
        "empty": False,
        "datasets": datasets,
        "y_bounds": {
            "min": y_min,
            "max": y_max
        }
    })




# =================== GRAPH 2: Performance Stability Index ===================
@charts.route("/dashboard/performance_stability_index")
@login_required
def performance_stability_index():
    """
    Composite metric combining:
    - Grade volatility (lower is better)
    - Late submission rate (lower is better)
    - Incomplete ratio (lower is better)
    Higher PSI = more stable performance
    """
    
    # Get all assignments
    results = db.session.query(
        Assignment.assignment_id,
        Assignment.class_id,
        Assignment.grade,
        Assignment.due_at,
        Assignment.finished_at,
        Assignment.created_at,
        Assignment.is_completed,
        Class.class_name
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id
    ).all()
    
    if not results:
        return jsonify({"empty": True, "message": "No assignments yet"})
    
    df = pd.DataFrame([{
        'assignment_id': r.assignment_id,
        'class_id': r.class_id,
        'class_name': r.class_name,
        'grade': float(r.grade) if r.grade else None,
        'due_at': r.due_at,
        'finished_at': r.finished_at,
        'created_at': r.created_at,
        'is_completed': r.is_completed
    } for r in results])
    
    # Bucket by week using created_at
        # ✅ Normalize timezone
    df['created_at'] = pd.to_datetime(df['created_at'], utc=True)
    df['due_at'] = pd.to_datetime(df['due_at'], utc=True)

    df['week'] = (
        df['created_at']
        .dt.to_period('W')
        .apply(lambda p: p.start_time)
    )

    
    weekly_psi = []
    
    for week in sorted(df['week'].unique()):
        week_data = df[df['week'] == week]
        
        # 1. Grade Volatility (std dev of grades)
        graded = week_data[week_data['grade'].notna()]
        if len(graded) >= 2:
            grade_std = graded['grade'].std()
        else:
            grade_std = 0
        
        # 2. Late Submission Rate
        completed = week_data[week_data['is_completed'] == True]
        if len(completed) > 0:
            late_count = len(completed[
                (completed['finished_at'].notna()) &
                (completed['due_at'].notna()) &
                (completed['finished_at'] > completed['due_at'])
            ])
            late_rate = late_count / len(completed)
        else:
            late_rate = 0
        
        # 3. Incomplete Ratio
        total_assignments = len(week_data)
        incomplete_count = len(week_data[week_data['is_completed'] == False])
        incomplete_ratio = incomplete_count / total_assignments if total_assignments > 0 else 0
        
        weekly_psi.append({
            'week': week,
            'grade_std': grade_std,
            'late_rate': late_rate,
            'incomplete_ratio': incomplete_ratio
        })
    
    psi_df = pd.DataFrame(weekly_psi)
    
    if len(psi_df) == 0:
        return jsonify({"empty": True, "message": "Insufficient data"})
    
    # Normalize each component (min-max normalization)
    def normalize(series):
        min_val = series.min()
        max_val = series.max()
        if max_val == min_val:
            return pd.Series([0.5] * len(series))
        return (series - min_val) / (max_val - min_val)
    
    psi_df['grade_std_norm'] = normalize(psi_df['grade_std'])
    psi_df['late_rate_norm'] = normalize(psi_df['late_rate'])
    psi_df['incomplete_ratio_norm'] = normalize(psi_df['incomplete_ratio'])
    
    # Compute PSI (weighted penalty, then invert)
    psi_df['penalty'] = (
        0.5 * psi_df['grade_std_norm'] +
        0.3 * psi_df['late_rate_norm'] +
        0.2 * psi_df['incomplete_ratio_norm']
    )
    psi_df['psi'] = 100 * (1 - psi_df['penalty'])
    
    # Sort by week
    psi_df = psi_df.sort_values('week')
    
    data = [
        {'x': row['week'].isoformat(), 'y': round(row['psi'], 1)}
        for _, row in psi_df.iterrows()
    ]
    
    return jsonify({
        "empty": False,
        "data": data
    })


# =================== GRAPH 3: Effort → Outcome Timeline ===================
@charts.route("/dashboard/effort_outcome_timeline")
@login_required
def effort_outcome_timeline():
    """
    Dual-axis chart showing:
    - Study effort (minutes per week)
    - Grade outcomes (weekly average)
    """
    
    # Get study sessions
    study_results = db.session.query(
        StudySession.class_id,
        StudySession.started_at,
        StudySession.duration_minutes,
        Class.class_name
    ).join(
        Class, Class.class_id == StudySession.class_id
    ).filter(
        StudySession.user_id == current_user.user_id,
        StudySession.is_completed == True,
        StudySession.started_at.isnot(None),
        StudySession.duration_minutes.isnot(None)
    ).all()
    
    # Get graded assignments
    grade_results = db.session.query(
        Assignment.class_id,
        Assignment.finished_at,
        Assignment.grade,
        Class.class_name
    ).join(
        Class, Class.class_id == Assignment.class_id
    ).filter(
        Assignment.user_id == current_user.user_id,
        Assignment.grade.isnot(None),
        Assignment.finished_at.isnot(None)
    ).all()
    
    if not study_results and not grade_results:
        return jsonify({"empty": True, "message": "No study sessions or grades yet"})
    
    # Process study effort
    study_df = pd.DataFrame([{
        'class_id': r.class_id,
        'class_name': r.class_name,
        'started_at': r.started_at,
        'duration_minutes': r.duration_minutes
    } for r in study_results]) if study_results else pd.DataFrame()
    
    # Process grades
    grade_df = pd.DataFrame([{
        'class_id': r.class_id,
        'class_name': r.class_name,
        'finished_at': r.finished_at,
        'grade': float(r.grade)
    } for r in grade_results]) if grade_results else pd.DataFrame()
    
    

    # Bucket by week
    if not study_df.empty:
        study_df['started_at'] = pd.to_datetime(study_df['started_at'], utc=True)
        study_df['week'] = (
            study_df['started_at']
            .dt.to_period('W')
            .apply(lambda p: p.start_time)
        )
        effort_weekly = (
            study_df
            .groupby(['week', 'class_id'])['duration_minutes']
            .sum()
            .groupby('week')
            .mean()
            .reset_index()
        )

    else:
        effort_weekly = pd.DataFrame(columns=['week', 'duration_minutes'])
    
    if not grade_df.empty:
        grade_df['finished_at'] = pd.to_datetime(grade_df['finished_at'], utc=True)
        grade_df['week'] = (
            grade_df['finished_at']
            .dt.to_period('W')
            .apply(lambda p: p.start_time)
        )
        grade_weekly = grade_df.groupby('week')['grade'].mean().reset_index()
    else:
        grade_weekly = pd.DataFrame(columns=['week', 'grade'])
    
    # Merge on week
    if not effort_weekly.empty and not grade_weekly.empty:
        merged = pd.merge(effort_weekly, grade_weekly, on='week', how='outer').sort_values('week')
    elif not effort_weekly.empty:
        merged = effort_weekly.sort_values('week')
        merged['grade'] = None
    elif not grade_weekly.empty:
        merged = grade_weekly.sort_values('week')
        merged['duration_minutes'] = None
    else:
        return jsonify({"empty": True, "message": "Insufficient data"})
    
    effort_data = [
        {'x': row['week'].isoformat(), 'y': int(row['duration_minutes']) if pd.notna(row.get('duration_minutes')) else None}
        for _, row in merged.iterrows()
    ]
    
    grade_data = [
        {'x': row['week'].isoformat(), 'y': round(row['grade'], 1) if pd.notna(row.get('grade')) else None}
        for _, row in merged.iterrows()
    ]
    
    return jsonify({
        "empty": False,
        "effort_data": effort_data,
        "grade_data": grade_data
    })


# =================== GRAPH 4: Lag Correlation Heatmap ===================
@charts.route("/dashboard/lag_correlation_heatmap")
@login_required
def lag_correlation_heatmap():
    """
    Heatmap showing correlation between study effort and grades
    at different time lags (0-3 weeks) for each class.
    """
    
    # Get all classes
    classes = db.session.query(Class).filter(
        Class.user_id == current_user.user_id
    ).all()
    
    if not classes:
        return jsonify({"empty": True, "message": "No classes yet"})
    
    heatmap_data = []
    class_labels = []
    
    for cls in classes:
        # Get study sessions for this class
        study_results = db.session.query(
            StudySession.started_at,
            StudySession.duration_minutes
        ).filter(
            StudySession.class_id == cls.class_id,
            StudySession.is_completed == True,
            StudySession.started_at.isnot(None),
            StudySession.duration_minutes.isnot(None)
        ).all()
        
        # Get grades for this class
        grade_results = db.session.query(
            Assignment.finished_at,
            Assignment.grade
        ).filter(
            Assignment.class_id == cls.class_id,
            Assignment.grade.isnot(None),
            Assignment.finished_at.isnot(None)
        ).all()
        
        if len(study_results) < 4 or len(grade_results) < 4:
            # Need minimum data points
            continue
        
        # Convert to weekly series
        study_df = pd.DataFrame([{
            'started_at': r.started_at,
            'duration_minutes': r.duration_minutes
        } for r in study_results])
        study_df['started_at'] = pd.to_datetime(study_df['started_at'], utc=True)
        study_df['week'] = (
            study_df['started_at']
            .dt.to_period('W')
            .apply(lambda x: x.start_time)
        )
        effort_series = study_df.groupby('week')['duration_minutes'].sum()
        
        grade_df = pd.DataFrame([{
            'finished_at': r.finished_at,
            'grade': float(r.grade)
        } for r in grade_results])
        grade_df['finished_at'] = pd.to_datetime(grade_df['finished_at'], utc=True)
        grade_df['week'] = (
            grade_df['finished_at']
            .dt.to_period('W')
            .apply(lambda x: x.start_time)
        )
        grade_series = grade_df.groupby('week')['grade'].mean()
        
        # Compute correlations at different lags (0-3 weeks)
        correlations = []
        max_lag = 3
        
        for lag in range(max_lag + 1):
            # Shift effort series by lag
            effort_shifted = effort_series.shift(lag)
            
            # Align both series
            aligned = pd.DataFrame({
                'effort': effort_shifted,
                'grade': grade_series
            }).dropna()
            
            if len(aligned) < 4:
                correlations.append(None)  # Not enough data
                continue
            
            # Compute correlation
            corr = aligned['effort'].corr(aligned['grade'])
            correlations.append(corr if not pd.isna(corr) else None)
        
        # Only include if we have at least one valid correlation
        if any(c is not None for c in correlations):
            class_labels.append(cls.class_name)
            heatmap_data.append(correlations)
    
    if not heatmap_data:
        return jsonify({"empty": True, "message": "Insufficient data for correlation analysis"})
    
    return jsonify({
        "empty": False,
        "class_labels": class_labels,
        "lag_labels": ["Lag 0", "Lag 1", "Lag 2", "Lag 3"],
        "data": heatmap_data
    })