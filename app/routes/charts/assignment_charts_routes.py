from flask import jsonify, request
from flask_login import login_required, current_user
from app.routes.charts import charts
from app.models.assignment import Assignment
from app.models.course import Class
from app.models.study_session import StudySession
from app.extensions import db
from sqlalchemy import func
from datetime import datetime, timezone, timedelta


@charts.route('/assignments/due_timeline')
@login_required
def assignments_due_timeline():
    """Return counts of assignments due over a window, grouped per class and total.
    Query params:
      mode=days|weeks (default days)
    """
    mode = request.args.get('mode', 'days')

    now = datetime.now(timezone.utc)

    if mode == 'weeks':
        # compute next 4 weeks starting from this week's Monday
        weekday = now.weekday()  # Monday=0
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
        # days: today + next 6 days
        start_date = now.date()
        days = [start_date + timedelta(days=i) for i in range(7)]
        labels = [d.strftime('%a') for d in days]

    # load relevant assignments (future due_at only)
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

    # initialize per-class buckets
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

    return jsonify({'labels': labels, 'datasets': datasets, 'total': total_ds})


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
                Assignment.assignment_type == t,
                Assignment.is_completed == False
            )
            if since is not None:
                q = q.filter(Assignment.created_at >= since)
            count = q.scalar() or 0
            result.append(count)
        else:
            # study_time: sum duration_minutes from study sessions for assignments of this type
            q = db.session.query(func.coalesce(func.sum(StudySession.duration_minutes), 0)).join(Assignment, StudySession.assignment_id == Assignment.assignment_id).join(Class).filter(
                Class.user_id == current_user.user_id,
                Assignment.assignment_type == t
            )
            if since is not None:
                q = q.filter(StudySession.created_at >= since)
            minutes = q.scalar() or 0
            result.append(minutes)

    # colors: fetch user assignment type colors
    colors = {}
    rows = db.session.query(func.coalesce(db.func.jsonb_build_object('assignment_type', db.func.coalesce(db.text("''"), '')), '{}'))
    from app.models.user import UserAssignmentTypeColor
    color_rows = UserAssignmentTypeColor.query.filter_by(user_id=current_user.user_id).all()
    color_map = {r.assignment_type: r.color for r in color_rows}

    colors_list = [color_map.get(t, '#4f46e5') for t in types]

    return jsonify({'types': types, 'values': result, 'colors': colors_list})
