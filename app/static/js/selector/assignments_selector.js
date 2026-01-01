import { applyVisibilityAndOrder as applyClassesFX } from './selector_apply.js';

const IMPORTANCE_RANK = { high: 3, medium: 2, low: 1 };

function getClassFilters(root = document) {
    return {
        sortBy: root.querySelector('#classSortBy')?.value,
        status: root.querySelector('#classStatusFilter')?.value,
        importance: {
            high: !!root.querySelector(".selector-group input[value='high']")?.checked,
            medium: !!root.querySelector(".selector-group input[value='medium']")?.checked,
            low: !!root.querySelector(".selector-group input[value='low']")?.checked
        },
        classTypes: [...root.querySelectorAll("input[name='class_type_selector']:checked")]
            .map(cb => cb.id.replace('class_type_selector_', ''))
    };
}

function getAssignmentFilters(root = document) {
    const assignmentTypes = [...root.querySelectorAll('.selector-group .selector-checks.grid input')]
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const sortCategory = root.querySelector("input[name='sortCategory']:checked")?.value || 'name';

    return {
        tableLayout: root.querySelector('#tableLayout')?.value || 'single',
        dueStatus: root.querySelector('#dueStatusFilter')?.value || 'all',
        completion: root.querySelector('#completionFilter')?.value || 'all',
        graded: root.querySelector('#gradedFilter')?.value || 'all',
        created: root.querySelector('#createdFilter')?.value || 'all',
        assignmentTypes,
        sortCategory,
        sortBy: root.querySelector('#assignmentSortBy')?.value
    };
}

function classMatches(filters, classData) {
    // status
    if (filters.status !== 'all' && classData.classFinished !== filters.status) return false;

    // importance
    const imp = classData.classImportance || '';
    if (imp && !filters.importance[imp]) return false;

    // classTypes
    if (filters.classTypes.length > 0) {
        const normalized = (classData.classType || '').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
        if (!filters.classTypes.includes(normalized)) return false;
    }

    return true;
}

function assignmentMatches(filters, row) {
    // due status
    const dueAt = row.dataset.dueAt ? new Date(row.dataset.dueAt) : null;
    const now = new Date();

    if (filters.dueStatus === 'overdue') {
        if (!dueAt || dueAt >= now) return false;
    } else if (filters.dueStatus === 'not_due') {
        if (dueAt && dueAt < now) return false;
    }

    // completion
    const completed = row.dataset.completed === 'True' || row.dataset.completed === 'true' || row.dataset.completed === '1';
    if (filters.completion === 'completed' && !completed) return false;
    if (filters.completion === 'uncompleted' && completed) return false;

    // graded
    const graded = row.dataset.graded === 'True' || row.dataset.graded === 'true' || row.dataset.graded === '1';
    if (filters.graded === 'graded' && !graded) return false;
    if (filters.graded === 'ungraded' && graded) return false;

    // created
    if (filters.created === 'last_7_days' || filters.created === 'last_30_days') {
        const createdTs = row.dataset.createdAt ? Number(row.dataset.createdAt) * 1000 : null;
        if (!createdTs) return false;
        const days = filters.created === 'last_7_days' ? 7 : 30;
        const limit = Date.now() - days * 24 * 60 * 60 * 1000;
        if (createdTs < limit) return false;
    }

    // assignment type
    if (filters.assignmentTypes && filters.assignmentTypes.length > 0) {
        const t = (row.dataset.assignmentType || '').toLowerCase();
        if (!filters.assignmentTypes.includes(t)) return false;
    }

    return true;
}

function hideWithAnimation(el) {
    if (el.classList.contains('hidden') || el.dataset.hiding === 'true') return;
    el.dataset.hiding = 'true';
    el.style.transition = 'transform 180ms ease, opacity 180ms ease';
    el.style.opacity = 0;
    el.style.transform = 'scale(0.98)';
    const onEnd = (e) => {
        if (e && e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
        el.classList.add('hidden');
        el.style.transition = '';
        el.style.opacity = '';
        el.style.transform = '';
        el.dataset.hiding = '';
        el.removeEventListener('transitionend', onEnd);
    };
    el.addEventListener('transitionend', onEnd);
}

function showWithAnimation(el) {
    if (!el.classList.contains('hidden')) return;
    el.classList.remove('hidden');
    el.style.opacity = 0;
    el.style.transform = 'scale(0.98)';
    void el.offsetWidth;
    requestAnimationFrame(() => {
        el.style.transition = 'transform 220ms ease, opacity 200ms ease';
        el.style.opacity = '';
        el.style.transform = '';
    });
    const onEnd = () => {
        el.style.transition = '';
        el.style.opacity = '';
        el.style.transform = '';
        el.removeEventListener('transitionend', onEnd);
    };
    el.addEventListener('transitionend', onEnd);
}

function sortPerClassCards(wrapper, sortBy) {
    const cards = [...wrapper.querySelectorAll('.per-class-card')];
    const getVal = (card) => {
        const firstRow = card.querySelector('tbody tr');
        return firstRow ? firstRow.dataset : {};
    };

    const num = v => (v === '' || v == null ? -Infinity : Number(v));

    cards.sort((a, b) => {
        const da = getVal(a);
        const db = getVal(b);

        switch (sortBy) {
            case 'name_asc': return (da.class || '').localeCompare(db.class || '');
            case 'name_desc': return (db.class || '').localeCompare(da.class || '');
            case 'importance_high_low': return (IMPORTANCE_RANK[db['classImportance']] ?? 0) - (IMPORTANCE_RANK[da['classImportance']] ?? 0);
            case 'importance_low_high': return (IMPORTANCE_RANK[da['classImportance']] ?? 0) - (IMPORTANCE_RANK[db['classImportance']] ?? 0);
            case 'difficulty_high_low': return num(db['difficulty']) - num(da['difficulty']);
            case 'difficulty_low_high': return num(da['difficulty']) - num(db['difficulty']);
            case 'grade_high_low': return num(db['grade']) - num(da['grade']);
            case 'grade_low_high': return num(da['grade']) - num(db['grade']);
            case 'created_newest': return num(db['createdAt']) - num(da['createdAt']);
            case 'created_oldest': return num(da['createdAt']) - num(db['createdAt']);
            default: return 0;
        }
    });

    // Append in new order with FLIP
    const firstRects = new Map();
    cards.forEach(c => firstRects.set(c, c.getBoundingClientRect()));
    cards.forEach(c => wrapper.appendChild(c));
    const lastRects = new Map();
    cards.forEach(c => lastRects.set(c, c.getBoundingClientRect()));

    cards.forEach(c => {
        const first = firstRects.get(c);
        const last = lastRects.get(c);
        if (!first) return;
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (dx !== 0 || dy !== 0) {
            c.style.transition = 'none';
            c.style.transform = `translate(${dx}px, ${dy}px)`;
            void c.offsetWidth;
            requestAnimationFrame(() => {
                c.style.transition = 'transform 350ms ease';
                c.style.transform = '';
            });
            const cleanup = () => { c.style.transition = ''; c.removeEventListener('transitionend', cleanup); };
            c.addEventListener('transitionend', cleanup);
        }
    });
}

function sortRows(tbody, sortBy) {
    const rows = [...tbody.querySelectorAll('tr')];
    const num = v => (v === '' || v == null ? -Infinity : Number(v));

    rows.sort((a, b) => {
        switch (sortBy) {
            case 'name_asc': return a.dataset.title.localeCompare(b.dataset.title);
            case 'name_desc': return b.dataset.title.localeCompare(a.dataset.title);
            case 'grade_high_low': return num(b.dataset.grade) - num(a.dataset.grade);
            case 'grade_low_high': return num(a.dataset.grade) - num(b.dataset.grade);
            case 'due_date_soonest': return (a.dataset.dueAt ? new Date(a.dataset.dueAt).getTime() : Infinity) - (b.dataset.dueAt ? new Date(b.dataset.dueAt).getTime() : Infinity);
            case 'due_date_latest': return (b.dataset.dueAt ? new Date(b.dataset.dueAt).getTime() : -Infinity) - (a.dataset.dueAt ? new Date(a.dataset.dueAt).getTime() : -Infinity);
            case 'created_newest': return num(b.dataset.createdAt) - num(a.dataset.createdAt);
            case 'created_oldest': return num(a.dataset.createdAt) - num(b.dataset.createdAt);
            case 'difficulty_high_low': return num(b.dataset.difficulty) - num(a.dataset.difficulty);
            case 'difficulty_low_high': return num(a.dataset.difficulty) - num(b.dataset.difficulty);
            case 'estimated_minutes_high_low': return num(b.dataset.estimatedMinutes) - num(a.dataset.estimatedMinutes);
            case 'estimated_minutes_low_high': return num(a.dataset.estimatedMinutes) - num(b.dataset.estimatedMinutes);
            case 'study_minutes_high_low': return num(b.dataset.studyMinutes) - num(a.dataset.studyMinutes);
            case 'study_minutes_low_high': return num(a.dataset.studyMinutes) - num(b.dataset.studyMinutes);
            default: return 0;
        }
    });

    // apply order
    const firstRects = new Map();
    rows.forEach(r => firstRects.set(r, r.getBoundingClientRect()));
    rows.forEach(r => tbody.appendChild(r));
    const lastRects = new Map();
    rows.forEach(r => lastRects.set(r, r.getBoundingClientRect()));

    rows.forEach(r => {
        const first = firstRects.get(r);
        const last = lastRects.get(r);
        if (!first) return;
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (dx !== 0 || dy !== 0) {
            r.style.transition = 'none';
            r.style.transform = `translate(${dx}px, ${dy}px)`;
            void r.offsetWidth;
            requestAnimationFrame(() => {
                r.style.transition = 'transform 300ms ease';
                r.style.transform = '';
            });
            const cleanup = () => { r.style.transition = ''; r.removeEventListener('transitionend', cleanup); };
            r.addEventListener('transitionend', cleanup);
        }
    });
}

export function initAssignmentsSelector() {
    const applyClassBtn = document.getElementById('applyClassFilters');
    const applyAssignmentBtn = document.getElementById('applyAssignmentFilters');
    const tableLayoutSelect = document.getElementById('tableLayout');
    const classSortGroup = document.querySelector('#classSortBy')?.closest('.selector-group');

    let lastAppliedClassFilters = getClassFilters();
    let lastAppliedAssignmentFilters = getAssignmentFilters();

    // Show/hide classSortBy depending on layout
    const updateClassSortVisibility = () => {
        const layout = document.getElementById('tableLayout')?.value;
        if (!classSortGroup) return;
        if (layout === 'per_class') classSortGroup.classList.remove('hidden');
        else classSortGroup.classList.add('hidden');
    };

    tableLayoutSelect?.addEventListener('change', updateClassSortVisibility);
    updateClassSortVisibility();

    // Adjust assignmentSortBy options based on sortCategory
    const updateAssignmentSortOptions = () => {
        const cat = document.querySelector("input[name='sortCategory']:checked")?.value || 'name';
        const sortSelect = document.getElementById('assignmentSortBy');
        if (!sortSelect) return;
        let firstVisible = null;
        [...sortSelect.options].forEach(opt => {
            const oc = opt.dataset.cat || 'name';
            const ok = oc === cat;
            opt.hidden = !ok;
            if (ok && firstVisible === null) firstVisible = opt.value;
        });
        if (firstVisible && ![...sortSelect.options].find(o => !o.hidden && o.value === sortSelect.value)) {
            sortSelect.value = firstVisible;
        }
    };
    document.querySelectorAll("input[name='sortCategory']").forEach(r => r.addEventListener('change', updateAssignmentSortOptions));
    updateAssignmentSortOptions();

    const applyAll = () => {
        // Use lastApplied* states to control UI
        const classFilters = lastAppliedClassFilters;
        const assignmentFilters = lastAppliedAssignmentFilters;

        // layout
        if (assignmentFilters.tableLayout === 'per_class') {
            // show per-class
            document.querySelector('.per-class-wrapper')?.classList.remove('hidden');
            document.querySelector('.assignments-table-card[data-table-mode="single"]')?.classList.add('hidden');

            const wrapper = document.querySelector('.per-class-wrapper');
            // Apply class-level filtering to per-class cards
            const cards = wrapper.querySelectorAll('.per-class-card');
            cards.forEach(card => {
                const firstRow = card.querySelector('tbody tr');
                if (!firstRow) return hideWithAnimation(card);
                const classData = {
                    classImportance: firstRow.dataset.classImportance,
                    classType: firstRow.dataset.classType,
                    classFinished: firstRow.dataset.classFinished
                };
                if (!classMatches(classFilters, classData)) {
                    hideWithAnimation(card);
                    return;
                }
                // class matches -> show card then filter its rows
                showWithAnimation(card);
                const tbody = card.querySelector('tbody');
                let visibleRows = 0;
                tbody.querySelectorAll('tr').forEach(row => {
                    const ok = assignmentMatches(assignmentFilters, row);
                    if (ok) showWithAnimation(row); else hideWithAnimation(row);
                    if (ok) visibleRows++;
                });
                if (visibleRows === 0) {
                    hideWithAnimation(card);
                }
            });

            // Sort classes if requested
            if (classFilters.sortBy) sortPerClassCards(wrapper, classFilters.sortBy);

            // Sort rows in each visible table based on assignment sortBy
            if (assignmentFilters.sortBy) {
                document.querySelectorAll('.per-class-card').forEach(card => {
                    if (card.classList.contains('hidden')) return;
                    const tbody = card.querySelector('tbody');
                    sortRows(tbody, assignmentFilters.sortBy);
                });
            }
        } else {
            // single table
            document.querySelector('.per-class-wrapper')?.classList.add('hidden');
            document.querySelector('.assignments-table-card[data-table-mode="single"]')?.classList.remove('hidden');

            const tableCard = document.querySelector('.assignments-table-card[data-table-mode="single"]');
            const tbody = tableCard.querySelector('tbody');
            let visibleRows = 0;
            tbody.querySelectorAll('tr').forEach(row => {
                const classData = {
                    classImportance: row.dataset.classImportance,
                    classType: row.dataset.classType,
                    classFinished: row.dataset.classFinished
                };
                const okClass = classMatches(classFilters, classData);
                const okAssign = assignmentMatches(assignmentFilters, row);
                const ok = okClass && okAssign;
                if (ok) showWithAnimation(row); else hideWithAnimation(row);
                if (ok) visibleRows++;
            });

            if (visibleRows === 0) {
                // insert or show placeholder row
                if (!tbody.querySelector('.no-results')) {
                    const tr = document.createElement('tr');
                    tr.className = 'no-results';
                    tr.innerHTML = '<td colspan="12" style="text-align:center; padding:18px; opacity:0.7;">No assignments match the filters</td>';
                    tbody.appendChild(tr);
                }
            } else {
                const nr = tbody.querySelector('.no-results');
                if (nr) nr.remove();
            }

            // Sort rows if requested
            if (assignmentFilters.sortBy) sortRows(tbody, assignmentFilters.sortBy);
        }
    };

    applyClassBtn?.addEventListener('click', () => {
        lastAppliedClassFilters = getClassFilters();
        applyAll();
    });

    applyAssignmentBtn?.addEventListener('click', () => {
        lastAppliedAssignmentFilters = getAssignmentFilters();
        applyAll();
    });

    // initialize UI to current selections but do not auto-apply filters
    updateClassSortVisibility();
    updateAssignmentSortOptions();
}

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssignmentsSelector);
} else {
    initAssignmentsSelector();
}
