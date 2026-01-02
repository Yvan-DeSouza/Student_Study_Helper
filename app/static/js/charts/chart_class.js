document.addEventListener("DOMContentLoaded", async () => {
    // ===============================
    // Populate Class Dropdown
    // ===============================
    const classSelect = document.getElementById("classHealthSelect");

    function populateClassDropdown(classes) {
        // Prefer the DOM-population helper defined later, else fall back
        if (typeof populateClassDropdownDOM === 'function') {
            return populateClassDropdownDOM(classes);
        }
        classSelect.innerHTML = `<option value="all">All</option>`;
        classes.forEach(c => {
            classSelect.innerHTML += `<option value="${c.class_id}">${c.class_name}</option>`;
        });
    }



    // ===============================
    // Grade vs Study Time Scatter
    // ===============================

    const scatterCanvas = document.getElementById("gradeStudyScatter");
    const scatterWrapper = scatterCanvas.parentElement;
    const scatterCtx = scatterCanvas.getContext("2d");

    const scatterRes = await fetch("/charts/classes/grade_vs_study_time");
    const scatterData = await scatterRes.json();

    if (scatterData.data.length === 0) {
        scatterWrapper.innerHTML = `
            <div class="chart-empty">
                Start completing study sessions for classes with grades to see this graph.
            </div>
        `;
    } else {
        new Chart(scatterCtx, {
            type: "bubble",
            data: {
                datasets: [{
                    data: scatterData.data,
                    backgroundColor: scatterData.data.map(p => p.backgroundColor)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500, easing: 'easeOutCubic' },
                scales: {
                    x: {
                        min: 0,
                        title: { display: true, text: "Total Study Time (minutes)" }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        title: { display: true, text: "Average Grade (%)" }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(context) { return context[0]?.raw?.label || ''; },
                            label: function(context) {
                                const p = context.raw || {};
                                const grade = `Grade: ${p.y}`;
                                const time = `Total Study Time: ${p.x} min`;
                                const importance = `Importance: ${p.importance || 'N/A'}`;
                                return [grade, time, importance];
                            }
                        }
                    }
                }
            }
        });
    }


    // ===============================
    // Class Health Breakdown (Pie ↔ Bar)
    // ===============================

    const healthCtx = document
        .getElementById("classHealthGraph")
        .getContext("2d");

    const healthWrapper = document.getElementById('classHealthGraph').parentElement;
    // classSelect already defined above
    const timeFilter = document.getElementById('classHealthTimeFilter');
    const classTitle = document.getElementById('classHealthTitle');

    let healthChart = null;
    let currentHealthType = 'bar';

    async function fetchAndPopulateClassDropdown() {
        try {
            const res = await fetch('/charts/classes/list');
            if (res.ok) {
                const list = await res.json();
                populateClassDropdownDOM(list);
            }
        } catch (e) {
            console.error('Failed to load class list', e);
        }
    }

    function populateClassDropdownDOM(classes) {
        if (!classSelect) return;
        classSelect.innerHTML = '<option value="all">All</option>' + classes.map(c => `\n            <option value="${c.class_id}">${c.class_name}</option>`).join('');
    }

    function showEmptyMessage(wrapper, message) {
        wrapper.querySelectorAll('.chart-empty').forEach(n => n.remove());
        const empty = document.createElement('div');
        empty.className = 'chart-empty';
        empty.textContent = message;
        wrapper.appendChild(empty);
        const canvas = wrapper.querySelector('canvas');
        if (canvas) canvas.style.display = 'none';
    }

    function clearEmptyMessage(wrapper) {
        wrapper.querySelectorAll('.chart-empty').forEach(n => n.remove());
        const canvas = wrapper.querySelector('canvas');
        if (canvas) canvas.style.display = '';
    }

    function ensureCanvasExists() {
        if (!document.getElementById('classHealthGraph')) {
            // recreate canvas inside wrapper
            const canvas = document.createElement('canvas');
            canvas.id = 'classHealthGraph';
            healthWrapper.appendChild(canvas);
        }
    }

    async function renderHealthChart(type = 'bar', classId = 'all', timeWindow = 'all') {
        if (healthChart) healthChart.destroy();
        clearEmptyMessage(healthWrapper);
        ensureCanvasExists();
        classTitle.classList.add('hidden');

        // If pie -> ask for summary for the selected class
        if (type === 'pie') {
            currentHealthType = 'pie';
            classTitle.classList.remove('hidden');
            const res = await fetch(`/charts/classes/class_health_summary?class_id=${classId}&time_window=${timeWindow}`);
            const data = await res.json();
            if (data.empty) {
                healthWrapper.innerHTML = `\n                    <div class="chart-empty">\n                        Start logging assignments to see this graph.\n                    </div>\n                `;
                return;
            }
            const total = data.total || (data.completed + data.in_progress + data.not_started);
            const values = [data.completed, data.in_progress, data.not_started];

            // Set title
            if (classId === 'all') classTitle.textContent = 'All classes';
            else classTitle.textContent = data.class_name || 'Class';

            healthChart = new Chart(document.getElementById('classHealthGraph').getContext('2d'), {
                type: 'pie',
                data: {
                    labels: ['Completed', 'In Progress', 'Not Started'],
                    datasets: [{ data: values, backgroundColor: ['#22c55e', '#facc15', '#ef4444'] }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 1,
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const v = context.parsed || 0;
                                    const pct = total ? ((v / total) * 100).toFixed(1) : '0.0';
                                    return [`Total assignments: ${v}`, `Percent: ${pct}%`];
                                },
                                title: function(context) {
                                    return context[0]?.label || '';
                                }
                            }
                        }
                    }
                }
            });
            return;
        }

        // Bar mode
        currentHealthType = 'bar';
        classTitle.classList.add('hidden');

        if (classId === 'all') {
            const res = await fetch(`/charts/classes/class_health?time_window=${timeWindow}`);
            const healthData = await res.json();
            if (!healthData || healthData.length === 0) {
                healthWrapper.innerHTML = `\n                    <div class="chart-empty">\n                        Start logging assignments to see this graph.\n                    </div>\n                `;
                return;
            }
            const labels = healthData.map(c => c.class_name);
            const completedData = healthData.map(c => c.completed);
            const inProgressData = healthData.map(c => c.in_progress);
            const notStartedData = healthData.map(c => c.not_started);

            healthChart = new Chart(document.getElementById('classHealthGraph').getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Completed', data: completedData, backgroundColor: '#22c55e' },
                        { label: 'In Progress', data: inProgressData, backgroundColor: '#facc15' },
                        { label: 'Not Started', data: notStartedData, backgroundColor: '#ef4444' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    scales: { x: { stacked: true }, y: { stacked: true, max: 100, title: { display: true, text: 'Percentage of Assignments (%)' } } }
                }
            });
        } else {
            // single-class bar (use summary endpoint)
            const res = await fetch(`/charts/classes/class_health_summary?class_id=${classId}&time_window=${timeWindow}`);
            const data = await res.json();
            if (data.empty) {
                healthWrapper.innerHTML = `\n                    <div class="chart-empty">\n                        Start logging assignments to see this graph.\n                    </div>\n                `;
                return;
            }
            const labels = [data.class_name || 'Class'];
            const datasets = [
                { label: 'Completed', data: [data.completed], backgroundColor: '#22c55e' },
                { label: 'In Progress', data: [data.in_progress], backgroundColor: '#facc15' },
                { label: 'Not Started', data: [data.not_started], backgroundColor: '#ef4444' }
            ];

            healthChart = new Chart(document.getElementById('classHealthGraph').getContext('2d'), {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    scales: { x: { stacked: true }, y: { stacked: true, max: 100, title: { display: true, text: 'Percentage of Assignments (%)' } } }
                }
            });
        }
    }

    // Toggle buttons
    document.querySelectorAll('.health-widget .chart-toggle button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.health-widget .chart-toggle button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentHealthType = btn.dataset.chart;
            renderHealthChart(currentHealthType, classSelect?.value || 'all', timeFilter?.value || 'all');
        });
    });

    // Dropdowns
    classSelect?.addEventListener('change', () => renderHealthChart(currentHealthType, classSelect.value, timeFilter?.value || 'all'));
    timeFilter?.addEventListener('change', () => renderHealthChart(currentHealthType, classSelect?.value || 'all', timeFilter.value));

    // Initial population and render
    await fetchAndPopulateClassDropdown();
    renderHealthChart('bar', 'all', 'all');

});
