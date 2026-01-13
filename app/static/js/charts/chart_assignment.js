document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dueCanvas = document.getElementById('assignmentDueTimelineChart');
    const dueWrapper = dueCanvas?.parentElement;
    const dueModeSelect = document.getElementById('dueTimelineMode');
    const classFiltersContainer = document.getElementById('dueTimelineClassFilters');

    const typeCanvas = document.getElementById('assignmentTypeLoad');
    const typeTimeFilter = document.getElementById('assignmentTypeTimeFilter');

    let dueChart = null;
    let typeChart = null;

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

        // Attach listeners
        classFiltersContainer.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => {
            renderDueTimeline();
        }));
    }

    async function renderDueTimeline() {
        if (!dueCanvas) return;
        const mode = dueModeSelect?.value || 'days';
        const res = await fetch(`/charts/assignments/due_timeline?mode=${mode}`);
        if (!res.ok) return;
        const data = await res.json();
        const labels = data.labels || [];
        const datasetsRaw = data.datasets || [];
        const total = data.total || { data: [] };

        // Which class ids are checked?
        const checked = new Set();
        if (classFiltersContainer) {
            classFiltersContainer.querySelectorAll('input[type=checkbox]').forEach(cb => {
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

        // total line
        datasets.push({ label: total.label || 'Total', data: total.data || [], borderColor: '#111', backgroundColor: '#111', fill: false, borderWidth: 2 });

        if (dueChart) dueChart.destroy();
        dueChart = new Chart(dueCanvas.getContext('2d'), {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600, easing: 'easeOutCubic' },
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Assignments due' } } }
            }
        });
    }

    async function renderTypeLoad() {
        if (!typeCanvas) return;
        const metric = document.querySelector('.chart-toggle button.active')?.dataset?.metric || 'count';
        const time_window = typeTimeFilter?.value || 'all';
        const res = await fetch(`/charts/assignments/type_load?metric=${metric}&time_window=${time_window}`);
        if (!res.ok) return;
        const data = await res.json();
        const labels = data.types || [];
        const values = data.values || [];
        const colors = data.colors || labels.map(() => '#4f46e5');

        if (typeChart) typeChart.destroy();
        typeChart = new Chart(typeCanvas.getContext('2d'), {
            type: 'polarArea',
            data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600, easing: 'easeOutCubic' },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const v = context.raw || 0;
                                const sum = context.dataset.data.reduce((a,b) => a + b, 0) || 1;
                                const pct = ((v / sum) * 100).toFixed(1);
                                if (metric === 'count') return `${context.label}: ${pct}% (${v})`;
                                return `${context.label}: ${pct}% (${v} min)`;
                            }
                        }
                    }
                }
            }
        });
    }



    /* ========= ASSIGNMENT PROGRESS VS DEADLINE ========= */
    const progressCanvas = document.getElementById('assignmentProgressDeadline');
    const progressDropdown = document.getElementById('progressDeadlineLimit');
    let progressChart = null;
    const warningEl = document.getElementById('progressDeadlineWarning');


    async function renderProgressDeadline() {
        if (!progressCanvas) return;
        const limit = progressDropdown?.value || '5';

        if (warningEl) {
            warningEl.classList.add('hidden');
            warningEl.textContent = '';
        }
        
        try {
            const res = await fetch(`/charts/assignments/progress_deadline?limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch progress data');
            const data = await res.json();
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
                    `${totalAvailable} uncompleted assignment${totalAvailable !== 1 ? 's' : ''} with due dates.`;
                warningEl.classList.remove('hidden');
            }


            
            // Handle insufficient data
            if (data.error) {
                if (progressChart) progressChart.destroy();
                const ctx = progressCanvas.getContext('2d');
                ctx.clearRect(0, 0, progressCanvas.width, progressCanvas.height);
                ctx.font = '14px system-ui';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText(data.error, progressCanvas.width / 2, progressCanvas.height / 2);
                return;
            }
            
            const labels = assignments.map(a => a.title);
            
            // Expected progress dataset (hollow circles)
            const expectedData = assignments.map((a, idx) => ({
                x: a.expected_progress,
                y: idx,
                assignment: a
            }));
            
            // Actual progress dataset (filled circles)
            const actualData = assignments.map((a, idx) => ({
                x: a.actual_progress,
                y: idx,
                assignment: a
            }));
            
            if (progressChart) progressChart.destroy();
            
            progressChart = new Chart(progressCanvas.getContext('2d'), {
                type: 'scatter',
                data: {
                    datasets: [
                        {
                            label: 'Expected Progress',
                            data: expectedData,
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            borderColor: '#6366f1',
                            borderWidth: 2,
                            pointRadius: 8,
                            pointHoverRadius: 10
                        },
                        {
                            label: 'Actual Progress',
                            data: actualData,
                            backgroundColor: assignments.map(a => {
                                const gap = a.actual_progress - a.expected_progress;
                                if (gap < -10) return '#ef4444'; // red - behind
                                if (gap > 10) return '#10b981'; // green - ahead
                                return '#f59e0b'; // yellow - on pace
                            }),
                            borderColor: assignments.map(a => {
                                const gap = a.actual_progress - a.expected_progress;
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
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    plugins: {
                        legend: { display: true, position: 'top' },
                        tooltip: {
                            callbacks: {
                                title: (items) => {
                                    if (items.length === 0) return '';
                                    const a = items[0].raw.assignment;
                                    return a.title;
                                },
                                label: (context) => {
                                    const a = context.raw.assignment;
                                    const lines = [];
                                    lines.push(`${a.class_name} · ${a.assignment_type}`);
                                    lines.push('');
                                    lines.push(`Expected progress: ${a.expected_progress}%`);
                                    lines.push(`Actual progress: ${a.actual_progress}%`);
                                    
                                    const gap = a.actual_progress - a.expected_progress;
                                    let status = gap < -10 ? '🔴 Behind schedule' : 
                                            gap > 10 ? '🟢 Ahead of schedule' : '🟡 On pace';
                                    lines.push(`Pacing gap: ${gap > 0 ? '+' : ''}${gap}% ${status}`);
                                    lines.push('');
                                    lines.push(`Expected total time: ${a.expected_minutes} min`);
                                    lines.push(`Time spent so far: ${a.actual_minutes} min`);
                                    lines.push(`Remaining est.: ${a.remaining_minutes} min`);
                                    lines.push('');
                                    lines.push(`Due in: ${a.days_until_due} days`);
                                    lines.push(`Urgency level: ${a.urgency_level}`);
                                    
                                    return lines;
                                },
                                footer: () => 'Expected progress assumes steady work from your first study session.'
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            min: 0,
                            max: 100,
                            title: { display: true, text: 'Progress (%)' },
                            grid: { display: true }
                        },
                        y: {
                            type: 'category',
                            labels: labels,
                            title: { display: true, text: 'Assignment' },
                            grid: { display: false }
                        }
                    }
                },
                plugins: [{
                    id: 'connectingLines',
                    afterDatasetsDraw: (chart) => {
                        const ctx = chart.ctx;
                        const meta0 = chart.getDatasetMeta(0);
                        const meta1 = chart.getDatasetMeta(1);
                        
                        ctx.save();
                        ctx.strokeStyle = '#d1d5db';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([5, 5]);
                        
                        for (let i = 0; i < meta0.data.length; i++) {
                            const point0 = meta0.data[i];
                            const point1 = meta1.data[i];
                            
                            ctx.beginPath();
                            ctx.moveTo(point0.x, point0.y);
                            ctx.lineTo(point1.x, point1.y);
                            ctx.stroke();
                        }
                        
                        ctx.restore();
                    }
                }]
            });
        } catch (error) {
            console.error('Error rendering progress deadline chart:', error);
        }
    }

    // Event listener for dropdown
    progressDropdown?.addEventListener('change', () => renderProgressDeadline());


    // Also refresh when data updates 
    window.refreshAssignmentCharts = () => { 
        renderDueTimeline(); 
        renderTypeLoad(); 
        renderProgressDeadline(); 
    };

    // Toggle handlers for type metric
    document.querySelectorAll('.chart-toggle button').forEach(btn => btn.addEventListener('click', (e) => {
        document.querySelectorAll('.chart-toggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTypeLoad();
    }));

    dueModeSelect?.addEventListener('change', () => renderDueTimeline());
    typeTimeFilter?.addEventListener('change', () => renderTypeLoad());

    // Initial population
    (async () => {
        const classes = await fetchClasses();
        buildClassCheckboxes(classes);
        await renderDueTimeline();
        await renderTypeLoad();
        await renderProgressDeadline();
    })();



    // Allow external trigger
    window.refreshAssignmentCharts = () => { renderDueTimeline(); renderTypeLoad(); };

    // Also refresh when page receives custom event
    document.addEventListener('data-updated', () => { window.refreshAssignmentCharts(); });
});
