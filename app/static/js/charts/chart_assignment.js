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
    })();

    // Auto-refresh every 15s
    setInterval(() => {
        renderDueTimeline();
        renderTypeLoad();
    }, 15000);

    // Allow external trigger
    window.refreshAssignmentCharts = () => { renderDueTimeline(); renderTypeLoad(); };

    // Also refresh when page receives custom event
    document.addEventListener('data-updated', () => { window.refreshAssignmentCharts(); });
});
