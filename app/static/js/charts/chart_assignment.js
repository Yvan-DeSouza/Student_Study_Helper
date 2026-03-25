import { gateChart } from './chart_gatekeeper.js';

document.addEventListener('DOMContentLoaded', async () => {

    function getThemeColor(lightColor, darkColor) {
        const theme = document.documentElement.getAttribute('data-theme');
        return theme === 'dark' ? darkColor : lightColor;
    }

    // =================== RENDER FUNCTIONS ===================

    function renderAssignmentDueTimelineFront(progress) {
        const hasData =
            progress.incomplete_assignments_with_due.current >=
            progress.incomplete_assignments_with_due.required;
        const noIncomplete =
            progress.incomplete_assignments_with_due.current === 0;
        const hasWithoutDue =
            progress.incomplete_assignments_without_due.current > 0;

        if (noIncomplete && !hasWithoutDue) {
            return `
                <div class="chart-empty">
                    <p><strong>You have no due assignments!</strong></p>
                </div>
            `;
        }

        if (noIncomplete && hasWithoutDue) {
            return `
                <div class="chart-empty">
                    <p><strong>You have no due assignments!</strong></p>
                    <p><em> However, you have ${progress.incomplete_assignments_without_due.current} incomplete assignment(s) with no due date</em></p>
                </div>
            `;
        }

        return `
            <div class="chart-empty">
                <p><strong>Not enough data yet</strong></p>
                <ul>
                    <li>
                        Incomplete assignments with due dates:
                        ${progress.incomplete_assignments_with_due.current}/${progress.incomplete_assignments_with_due.required}
                        ${
                            progress.incomplete_assignments_with_due.current >=
                            progress.incomplete_assignments_with_due.required
                                ? '✅'
                                : '❌'
                        }
                    </li>
                </ul>
                ${
                    hasWithoutDue
                        ? `<p><em>Warning: You have ${progress.incomplete_assignments_without_due.current} incomplete assignment(s) with no due date</em></p>`
                        : ''
                }
            </div>
        `;
    }

    function renderAssignmentDueTimelineBack(ineligibleClasses, ineligibleAssignments) {
        let html = `
            <p><strong>Tips for using this chart:</strong></p>
            <ul>
                <li>Switch between days and weeks to zoom in/out on your workload</li>
                <li>Use class filters to isolate workload sources</li>
            </ul>
        `;

        if (ineligibleAssignments && ineligibleAssignments.length > 0) {
            html += `
                <p><strong>Hidden assignments (${ineligibleAssignments.length}):</strong></p>
                <p>The following assignments are not shown because they don't have due dates:</p>
                <ul>
                    ${ineligibleAssignments
                        .slice(0, 5)
                        .map(
                            a =>
                                `<li><strong>${a.assignment_name}</strong> (${a.class_name})</li>`
                        )
                        .join('')}
                    ${
                        ineligibleAssignments.length > 5
                            ? `<li><em>...and ${ineligibleAssignments.length - 5} more</em></li>`
                            : ''
                    }
                </ul>
            `;
        }

        return html;
    }

    function renderAssignmentTypeLoadFront(progress, representative) {
        const metric = progress.metric || 'count';
        const hasAssignments = progress.total_assignments.current > 0;
        const hasStudyTime = progress.assignments_with_study_time.current > 0;

        if (!hasAssignments) {
            return `
                <div class="chart-empty">
                    <p><strong> No assignments yet</strong></p>
                    <p>Once you add assignments, this chart will show how your workload is distributed.</p>
                </div>
            `;
        }

        if (hasAssignments && !hasStudyTime && metric === 'study_time') {
            return `
                <div class="chart-empty">
                    <p><strong>You have assignments, but no study time logged yet</strong></p>
                    <p>Start a study session to see time-based breakdowns.</p>
                    <p><em>Tip: Switch to "Count" mode to see assignment distribution.</em></p>
                </div>
            `;
        }

        return `
            <div class="chart-empty">
                <p><strong>Not enough data yet</strong></p>
                <ul>
                    <li>
                        Total assignments:
                        ${progress.total_assignments.current}/${progress.total_assignments.required}
                        ${
                            progress.total_assignments.current >=
                            progress.total_assignments.required
                                ? '✅'
                                : '❌'
                        }
                    </li>
                    ${
                        metric === 'study_time'
                            ? `
                    <li>
                        Assignments with study time:
                        ${progress.assignments_with_study_time.current}/${progress.assignments_with_study_time.required}
                        ${
                            progress.assignments_with_study_time.current >=
                            progress.assignments_with_study_time.required
                                ? '✅'
                                : '❌'
                        }
                    </li>
                    `
                            : ''
                    }
                </ul>
            </div>
        `;
    }

    function renderAssignmentTypeLoadBack(ineligibleClasses, ineligibleAssignments) {
        return `
            <p><strong>About this chart:</strong></p>
            <ul>
                <li><strong>Count mode:</strong> Shows how many assignments of each type you have</li>
                <li><strong>Study Time mode:</strong> Shows how much time you've spent on each type</li>
                <li>Both completed and incomplete assignments are included</li>
                <li>Time filters (7/30 days) may hide older data</li>
            </ul>
        `;
    }

    function renderAssignmentProgressDeadlineFront(progress) {
        const noIncomplete =
            progress.incomplete_assignments_with_due.current === 0;
        const hasWithoutDue =
            progress.incomplete_assignments_without_due.current > 0;

        if (noIncomplete && !hasWithoutDue) {
            return `
                <div class="chart-empty">
                    <p><strong>No upcoming assignments to track right now</strong></p>
                </div>
            `;
        }

        if (noIncomplete && hasWithoutDue) {
            return `
                <div class="chart-empty">
                    <p><strong>No upcoming assignments to track right now</strong></p>
                    <p><em>However, you have ${progress.incomplete_assignments_without_due.current} incomplete assignment(s) with no due date</em></p>
                </div>
            `;
        }

        return `
            <div class="chart-empty">
                <p><strong>Not enough data yet</strong></p>
                <ul>
                    <li>
                        Incomplete assignments with due dates:
                        ${progress.incomplete_assignments_with_due.current}/${progress.incomplete_assignments_with_due.required}
                        ${
                            progress.incomplete_assignments_with_due.current >=
                            progress.incomplete_assignments_with_due.required
                                ? '✅'
                                : '❌'
                        }
                    </li>
                </ul>
                ${
                    hasWithoutDue
                        ? `<p><em>Warning: You have ${progress.incomplete_assignments_without_due.current} incomplete assignment(s) with no due date</em></p>`
                        : ''
                }
            </div>
        `;
    }

    function renderAssignmentProgressDeadlineBack(ineligibleClasses, ineligibleAssignments) {
        let html = `
            <p><strong>How this chart works:</strong></p>
            <ul>
                <li><strong>Expected progress</strong> is calculated assuming steady work from your first study session to the deadline</li>
                <li><strong>Actual progress</strong> is based on your recorded study time vs. estimated total time needed</li>
                <li>Progress assumes linear pacing throughout the assignment timeline</li>
                <li>🟢 Green = Ahead of schedule | 🟡 Yellow = On pace | 🔴 Red = Behind schedule</li>
            </ul>
        `;

        if (ineligibleAssignments && ineligibleAssignments.length > 0) {
            html += `
                <p><strong>${ineligibleAssignments.length} assignment(s) not shown due to missing due dates:</strong></p>
                <ul>
                    ${ineligibleAssignments
                        .slice(0, 5)
                        .map(
                            a =>
                                `<li><strong>${a.assignment_name}</strong> (${a.class_name})</li>`
                        )
                        .join('')}
                    ${
                        ineligibleAssignments.length > 5
                            ? `<li><em>...and ${ineligibleAssignments.length - 5} more</em></li>`
                            : ''
                    }
                </ul>
            `;
        }

        return html;
    }

    // =================== GRAPH 1: Assignment Due Timeline ===================

    const dueCanvas = document.getElementById('assignmentDueTimelineChart');
    const dueModeSelect = document.getElementById('dueTimelineMode');
    const classFiltersContainer = document.getElementById('dueTimelineClassFilters');
    let dueChart = null;

    async function fetchClasses() {
        try {
            const res = await fetch('/charts/classes/list');
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error('fetchClasses', e);
            return [];
        }
    }

    function buildClassCheckboxes(classes) {
        if (!classFiltersContainer) return;

        classFiltersContainer.innerHTML = '';

        const allC = document.createElement('label');
        allC.className = 'selector-check';
        allC.innerHTML = `<input type="checkbox" value="all" checked> All`;
        classFiltersContainer.appendChild(allC);

        classes.forEach(c => {
            const lab = document.createElement('label');
            lab.className = 'selector-check';
            lab.innerHTML = `<input type="checkbox" value="${c.class_id}" checked> ${c.class_name}`;
            classFiltersContainer.appendChild(lab);
        });

        classFiltersContainer
            .querySelectorAll('input[type=checkbox]')
            .forEach(cb =>
                cb.addEventListener('change', () => {
                    renderDueTimeline();
                })
            );
    }

    async function renderDueTimeline() {
        if (!dueCanvas) return;

        const cardId = dueCanvas.getAttribute('data-card-id');
        const dueCard = cardId ? document.querySelector(`.chart-widget[data-card-id="${cardId}"]`) : null;
        if (!dueCard) {
            console.warn('[Charts] Due timeline card not found');
            return;
        }
        const mode = dueModeSelect?.value || 'days';

        const res = await fetch(`/charts/assignments/due_timeline?mode=${mode}`);
        if (!res.ok) return;

        const data = await res.json();

        if (
            gateChart(
                dueCard,
                data,
                renderAssignmentDueTimelineFront,
                renderAssignmentDueTimelineBack
            )
        ) {
            const labels = data.labels || [];
            const datasetsRaw = data.datasets || [];
            const total = data.total || { data: [] };

            const checked = new Set();

            if (classFiltersContainer) {
                classFiltersContainer
                    .querySelectorAll('input[type=checkbox]')
                    .forEach(cb => {
                        if (cb.checked) checked.add(cb.value);
                    });
            } else {
                checked.add('all');
            }

            const datasets = [];

            datasetsRaw.forEach(ds => {
                const id = String(ds.class_id);
                const show = checked.has('all') || checked.has(id);

                datasets.push({
                    label: ds.label,
                    data: ds.data,
                    borderColor: ds.color || '#666',
                    backgroundColor: ds.color || '#666',
                    fill: false,
                    hidden: !show,
                    tension: 0.3
                });
            });

            datasets.push({
                label: total.label || 'Total',
                data: total.data || [],
                borderColor: '#111',
                backgroundColor: '#111',
                fill: false,
                borderWidth: 2
            });

            if (dueChart) dueChart.destroy();

            const dueWrapper = dueCard.querySelector('.chart-wrapper');
            dueChart = new Chart(dueCanvas.getContext('2d'), {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { display: true } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Assignments due' },
                            grid: {
                                color: getThemeColor('#e5e7eb', '#374151')
                            }
                        },
                        x: {
                            grid: {
                                color: getThemeColor('#e5e7eb', '#374151')
                            }
                        }
                    }
                }
            });
            dueWrapper.style.height = dueChart.height + 'px';
        }
    }

    // =================== GRAPH 2: Assignment Type Load ===================

    const typeCanvas = document.getElementById('assignmentTypeLoad');
    const typeTimeFilter = document.getElementById('assignmentTypeTimeFilter');
    let typeChart = null;

    async function renderTypeLoad() {
        if (!typeCanvas) return;

        const cardId = typeCanvas.getAttribute('data-card-id');
        const typeCard = cardId ? document.querySelector(`.chart-widget[data-card-id="${cardId}"]`) : null;
        if (!typeCard) {
            console.warn('[Charts] Type load card not found');
            return;
        }
        const metric =
            document.querySelector('.chart-toggle button.active')?.dataset
                ?.metric || 'count';
        const time_window = typeTimeFilter?.value || 'all';

        const res = await fetch(
            `/charts/assignments/type_load?metric=${metric}&time_window=${time_window}`
        );
        if (!res.ok) return;

        const data = await res.json();

        if (
            gateChart(
                typeCard,
                data,
                progress => renderAssignmentTypeLoadFront(progress, null),
                renderAssignmentTypeLoadBack
            )
        ) {
            const labels = data.types || [];
            const values = data.values || [];
            const colors = data.colors || labels.map(() => '#4f46e5');

            if (typeChart) typeChart.destroy();

            typeChart = new Chart(typeCanvas.getContext('2d'), {
                type: 'polarArea',
                data: {
                    labels,
                    datasets: [{ data: values, backgroundColor: colors }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const v = context.raw || 0;
                                    const sum =
                                        context.dataset.data.reduce(
                                            (a, b) => a + b,
                                            0
                                        ) || 1;
                                    const pct = ((v / sum) * 100).toFixed(1);

                                    if (metric === 'count') {
                                        return `${context.label}: ${pct}% (${v})`;
                                    }

                                    return `${context.label}: ${pct}% (${v} min)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // =================== GRAPH 3: Assignment Progress vs Deadline ===================

    const progressCanvas = document.getElementById(
        'assignmentProgressDeadline'
    );
    const progressDropdown = document.getElementById(
        'progressDeadlineLimit'
    );
    const warningEl = document.getElementById(
        'progressDeadlineWarning'
    );
    let progressChart = null;

    async function renderProgressDeadline() {
        if (!progressCanvas) return;

        const cardId = progressCanvas.getAttribute('data-card-id');
        const progressCard = cardId ? document.querySelector(`.chart-widget[data-card-id="${cardId}"]`) : null;
        if (!progressCard) {
            console.warn('[Charts] Progress deadline card not found');
            return;
        }
        const limit = progressDropdown?.value || '5';

        if (warningEl) {
            warningEl.classList.add('hidden');
            warningEl.textContent = '';
        }

        try {
            const res = await fetch(
                `/charts/assignments/progress_deadline?limit=${limit}`
            );
            if (!res.ok) throw new Error('Failed to fetch progress data');

            const data = await res.json();

            if (
                gateChart(
                    progressCard,
                    data,
                    renderAssignmentProgressDeadlineFront,
                    renderAssignmentProgressDeadlineBack
                )
            ) {
                const assignments = data.assignments || [];
                const requested = data.requested || 0;
                const totalAvailable = data.total_available || 0;

                if (assignments.length === 0) {
                    if (progressChart) progressChart.destroy();
                    return;
                }

                if (requested > totalAvailable && warningEl) {
                    warningEl.textContent =
                        `Unable to show the next ${requested} upcoming assignments because you only have ` +
                        `${totalAvailable} uncompleted assignment${
                            totalAvailable !== 1 ? 's' : ''
                        } with due dates.`;
                    warningEl.classList.remove('hidden');
                }

                const labels = assignments.map(a => a.title);

                const expectedData = assignments.map((a, idx) => ({
                    x: a.expected_progress,
                    y: idx,
                    assignment: a
                }));

                const actualData = assignments.map((a, idx) => ({
                    x: a.actual_progress,
                    y: idx,
                    assignment: a
                }));

                if (progressChart) progressChart.destroy();

                progressChart = new Chart(
                    progressCanvas.getContext('2d'),
                    {
                        type: 'scatter',
                        data: {
                            datasets: [
                                {
                                    label: 'Expected Progress',
                                    data: expectedData,
                                    backgroundColor:
                                        'rgba(99, 102, 241, 0.2)',
                                    borderColor: '#6366f1',
                                    borderWidth: 2,
                                    pointRadius: 8,
                                    pointHoverRadius: 10
                                },
                                {
                                    label: 'Actual Progress',
                                    data: actualData,
                                    backgroundColor: assignments.map(a => {
                                        const gap =
                                            a.actual_progress -
                                            a.expected_progress;
                                        if (gap < -10) return '#ef4444';
                                        if (gap > 10) return '#10b981';
                                        return '#f59e0b';
                                    }),
                                    borderColor: assignments.map(a => {
                                        const gap =
                                            a.actual_progress -
                                            a.expected_progress;
                                        if (gap < -10) return '#dc2626';
                                        if (gap > 10) return '#059669';
                                        return '#d97706';
                                    }),
                                    borderWidth: 2,
                                    pointRadius: 8,
                                    pointHoverRadius: 10
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: {
                                duration: 600,
                                easing: 'easeOutCubic'
                            },
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top'
                                },
                                tooltip: {
                                    callbacks: {
                                        title: items => {
                                            if (items.length === 0) return '';
                                            return items[0].raw.assignment.title;
                                        },
                                        label: context => {
                                            const a =
                                                context.raw.assignment;
                                            const lines = [];

                                            lines.push(
                                                `${a.class_name} · ${a.assignment_type}`
                                            );
                                            lines.push('');
                                            lines.push(
                                                `Expected progress: ${a.expected_progress}%`
                                            );
                                            lines.push(
                                                `Actual progress: ${a.actual_progress}%`
                                            );

                                            const gap =
                                                a.actual_progress -
                                                a.expected_progress;
                                            const status =
                                                gap < -10
                                                    ? '🔴 Behind schedule'
                                                    : gap > 10
                                                    ? '🟢 Ahead of schedule'
                                                    : '🟡 On pace';

                                            lines.push(
                                                `Pacing gap: ${
                                                    gap > 0 ? '+' : ''
                                                }${gap}% ${status}`
                                            );
                                            lines.push('');
                                            lines.push(
                                                `Expected total time: ${a.expected_minutes} min`
                                            );
                                            lines.push(
                                                `Time spent so far: ${a.actual_minutes} min`
                                            );
                                            lines.push(
                                                `Remaining est.: ${a.remaining_minutes} min`
                                            );
                                            lines.push('');
                                            lines.push(
                                                `Due in: ${a.days_until_due} days`
                                            );
                                            lines.push(
                                                `Urgency level: ${a.urgency_level}`
                                            );

                                            return lines;
                                        },
                                        footer: () =>
                                            'Expected progress assumes steady work from your first study session.'
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    type: 'linear',
                                    position: 'bottom',
                                    min: 0,
                                    max: 100,
                                    title: {
                                        display: true,
                                        text: 'Progress (%)'
                                    },
                                    grid: {
                                        display: true,
                                        color: getThemeColor(
                                            '#e5e7eb',
                                            '#374151'
                                        )
                                    }
                                },
                                y: {
                                    type: 'category',
                                    labels,
                                    title: {
                                        display: true,
                                        text: 'Assignment'
                                    },
                                    grid: { display: false }
                                }
                            }
                        },
                        plugins: [
                            {
                                id: 'connectingLines',
                                afterDatasetsDraw: chart => {
                                    const ctx = chart.ctx;
                                    const meta0 =
                                        chart.getDatasetMeta(0);
                                    const meta1 =
                                        chart.getDatasetMeta(1);

                                    ctx.save();
                                    ctx.strokeStyle = '#d1d5db';
                                    ctx.lineWidth = 1;
                                    ctx.setLineDash([5, 5]);

                                    for (
                                        let i = 0;
                                        i < meta0.data.length;
                                        i++
                                    ) {
                                        const point0 = meta0.data[i];
                                        const point1 = meta1.data[i];

                                        ctx.beginPath();
                                        ctx.moveTo(point0.x, point0.y);
                                        ctx.lineTo(point1.x, point1.y);
                                        ctx.stroke();
                                    }

                                    ctx.restore();
                                }
                            }
                        ]
                    }
                );
            }
        } catch (error) {
            console.error(
                'Error rendering progress deadline chart:',
                error
            );
        }
    }

    // Event listeners

    progressDropdown?.addEventListener('change', () =>
        renderProgressDeadline()
    );
    dueModeSelect?.addEventListener('change', () =>
        renderDueTimeline()
    );
    typeTimeFilter?.addEventListener('change', () =>
        renderTypeLoad()
    );

    document
        .querySelectorAll('.chart-toggle button')
        .forEach(btn =>
            btn.addEventListener('click', () => {
                document
                    .querySelectorAll('.chart-toggle button')
                    .forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTypeLoad();
            })
        );

    // Initial render

    (async () => {
        const classes = await fetchClasses();
        buildClassCheckboxes(classes);
        await renderDueTimeline();
        await renderTypeLoad();
        await renderProgressDeadline();
    })();

    window.refreshAssignmentCharts = () => {
        renderDueTimeline();
        renderTypeLoad();
        renderProgressDeadline();
    };

    document.addEventListener('data-updated', () => {
        window.refreshAssignmentCharts();
    });
});
