from flask import jsonify, request
from flask_login import login_required, current_user
from app.routes.charts import charts
from app.models.assignment import Assignment
from app.models.course import Class
from app.models.study_session import StudySession
from app.models.user import UserAssignmentTypeColor
from app.extensions import db
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from app.services.expected_utils import estimate_expected_minutes
from app.services.risk_utils import compute_days_until_due
from app.services.analytics.chart_eligibility.assignments.assignments_eligibility import (
    get_assignment_due_timeline_eligibility,
    get_assignment_type_load_eligibility,
    get_assignment_progress_deadline_eligibility
)


@charts.route('/assignments/due_timeline')
@login_required
def assignments_due_timeline():
    """Return counts of assignments due over a window, grouped per class and total.
    Query params:
      mode=days|weeks (default days)
    """
    eligibility = get_assignment_due_timeline_eligibility(current_user.user_id)
    
    mode = request.args.get('mode', 'days')
    now = datetime.now(timezone.utc)

    if mode == 'weeks':
        weekday = now.weekday()
        this_monday = (now - timedelta(days=weekday)).date()
        weeks = []
        ranges = []
        for i in range(4):
            start = this_monday + timedelta(weeks=i)
            end = start + timedelta(days=6)
            weeks.append((start, end))
            ranges.append(f"{start.day}-{end.day}")
        labels = ranges
    else:
        start_date = now.date()
        days = [start_date + timedelta(days=i) for i in range(7)]
        labels = [d.strftime('%a') for d in days]

    if mode == 'weeks':
        window_end = weeks[-1][1]
        q = db.session.query(Assignment).join(Class).filter(
            Class.user_id == current_user.user_id,
            Assignment.due_at != None,
            func.date(Assignment.due_at) >= weeks[0][0],
            func.date(Assignment.due_at) <= window_end
        )
    else:
        q = db.session.query(Assignment).join(Class).filter(
            Class.user_id == current_user.user_id,
            Assignment.due_at != None,
            Assignment.due_at >= now
        )

    assignments = q.all()
    classes = db.session.query(Class).filter(Class.user_id == current_user.user_id).all()
    class_map = {c.class_id: {'class_id': c.class_id, 'class_name': c.class_name, 'color': c.color, 'counts': [0] * (4 if mode == 'weeks' else 7)} for c in classes}
    total_counts = [0] * (4 if mode == 'weeks' else 7)

    for a in assignments:
        if not a.due_at:
            continue
        adate = a.due_at.date()
        if mode == 'weeks':
            for idx, (s, e) in enumerate(weeks):
                if s <= adate <= e:
                    class_map[a.class_id]['counts'][idx] += 1
                    total_counts[idx] += 1
                    break
        else:
            for idx, d in enumerate(days):
                if adate == d:
                    class_map[a.class_id]['counts'][idx] += 1
                    total_counts[idx] += 1
                    break

    datasets = []
    for c in class_map.values():
        datasets.append({'class_id': c['class_id'], 'label': c['class_name'], 'color': c['color'], 'data': c['counts']})

    total_ds = {'label': 'Total', 'class_id': None, 'color': '#333', 'data': total_counts}

    return jsonify({
        'eligible': eligibility['eligible'],
        'eligibility': eligibility,
        'empty': not bool(assignments),
        'labels': labels,
        'datasets': datasets,
        'total': total_ds
    })


@charts.route('/assignments/type_load')
@login_required
def assignments_type_load():
    """Return counts or study time per assignment type.
    Query params:
      metric=count|study_time (default=count)
      time_window=all|last_7_days|last_30_days (optional)
    """
    metric = request.args.get('metric', 'count')
    time_window = request.args.get('time_window', 'all')
    
    eligibility = get_assignment_type_load_eligibility(current_user.user_id, metric)

    since = None
    if time_window == 'last_7_days':
        since = datetime.now(timezone.utc) - timedelta(days=7)
    elif time_window == 'last_30_days':
        since = datetime.now(timezone.utc) - timedelta(days=30)

    types = [
        'homework','project','quiz','test','writing','exam','lab_report','presentation','reading','other'
    ]

    result = []

    for t in types:
        if metric == 'count':
            q = db.session.query(func.count(Assignment.assignment_id)).join(Class).filter(
                Class.user_id == current_user.user_id,
                Assignment.assignment_type == t
            )
            if since is not None:
                q = q.filter(Assignment.created_at >= since)
            count = q.scalar() or 0
            result.append(count)
        else:
            q = db.session.query(func.coalesce(func.sum(StudySession.duration_minutes), 0)).join(Assignment, StudySession.assignment_id == Assignment.assignment_id).join(Class).filter(
                Class.user_id == current_user.user_id,
                Assignment.assignment_type == t
            )
            if since is not None:
                q = q.filter(StudySession.created_at >= since)
            minutes = q.scalar() or 0
            result.append(minutes)

    color_rows = UserAssignmentTypeColor.query.filter_by(user_id=current_user.user_id).all()
    color_map = {r.assignment_type: r.color for r in color_rows}
    colors_list = [color_map.get(t, '#4f46e5') for t in types]

    return jsonify({
        'eligible': eligibility['eligible'],
        'eligibility': eligibility,
        'empty': sum(result) == 0,
        'types': types,
        'values': result,
        'colors': colors_list
    })


@charts.route('/assignments/progress_deadline')
@login_required
def assignments_progress_deadline():
    eligibility = get_assignment_progress_deadline_eligibility(current_user.user_id)
    
    limit = request.args.get('limit', '5')
    try:
        limit = int(limit)
    except:
        limit = 5

    now = datetime.now(timezone.utc)

    all_assignments = (
        db.session.query(Assignment)
        .join(Class)
        .filter(
            Class.user_id == current_user.user_id,
            Assignment.is_completed == False,
            Assignment.due_at != None
        )
        .order_by(Assignment.due_at.asc())
        .all()
    )

    total_available = len(all_assignments)

    if total_available == 0:
        return jsonify({
            'eligible': eligibility['eligible'],
            'eligibility': eligibility,
            'empty': True,
            'assignments': [],
            'requested': limit,
            'total_available': 0
        })

    assignments = all_assignments[:limit]

    past_assignments = []
    completed = (
        db.session.query(Assignment)
        .join(Class)
        .filter(
            Class.user_id == current_user.user_id,
            Assignment.is_completed == True,
            Assignment.finished_at != None
        )
        .all()
    )

    for ca in completed:
        actual_minutes = (
            db.session.query(func.coalesce(func.sum(StudySession.duration_minutes), 0))
            .filter(
                StudySession.assignment_id == ca.assignment_id,
                StudySession.is_completed == True
            )
            .scalar() or 0
        )

        if actual_minutes > 0:
            past_assignments.append({
                'class_id': ca.class_id,
                'class_type': ca.class_.class_type,
                'assignment_type': ca.assignment_type,
                'actual_minutes': actual_minutes,
                'difficulty': ca.difficulty
            })

    result = []

    for a in assignments:
        if a.estimated_minutes:
            expected_minutes = a.estimated_minutes
        else:
            expected_minutes = estimate_expected_minutes(
                a.class_.class_type,
                a.assignment_type,
                a.class_id,
                past_assignments
            )

        actual_minutes = (
            db.session.query(func.coalesce(func.sum(StudySession.duration_minutes), 0))
            .filter(
                StudySession.assignment_id == a.assignment_id,
                StudySession.is_completed == True
            )
            .scalar() or 0
        )

        first_session = (
            db.session.query(StudySession)
            .filter(StudySession.assignment_id == a.assignment_id)
            .order_by(StudySession.started_at.asc())
            .first()
        )

        t_start = first_session.started_at if first_session and first_session.started_at else a.created_at
        t_due = a.due_at

        if t_due > t_start:
            expected_progress = max(
                0,
                min(100, ((now - t_start).total_seconds() / (t_due - t_start).total_seconds()) * 100)
            )
        else:
            expected_progress = 100

        actual_progress = (
            max(0, min(100, (actual_minutes / expected_minutes) * 100))
            if expected_minutes > 0 else 0
        )

        days_until_due = compute_days_until_due(a.due_at, now)
        days_until_due = round(days_until_due, 1) if days_until_due is not None else 0

        urgency_level = (
            'High (Overdue)' if days_until_due < 0 else
            'High' if days_until_due <= 2 else
            'Medium' if days_until_due <= 5 else
            'Low'
        )

        result.append({
            'assignment_id': a.assignment_id,
            'title': a.title,
            'class_name': a.class_.class_name,
            'assignment_type': a.assignment_type,
            'expected_progress': round(expected_progress, 1),
            'actual_progress': round(actual_progress, 1),
            'expected_minutes': expected_minutes,
            'actual_minutes': actual_minutes,
            'remaining_minutes': max(0, expected_minutes - actual_minutes),
            'days_until_due': days_until_due,
            'urgency_level': urgency_level,
            'due_at': a.due_at.isoformat()
        })

    return jsonify({
        'eligible': eligibility['eligible'],
        'eligibility': eligibility,
        'empty': False,
        'assignments': result,
        'requested': limit,
        'total_available': total_available
    })