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
        showEmptyMessage(
            scatterWrapper,
            "Start completing study sessions for classes with grades to see this graph."
        );
        return;
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

    function showEmptyMessage(chartWrapper, message) {
        clearEmptyMessage(chartWrapper);

        let empty = chartWrapper.querySelector('.chart-empty');
        if (!empty) {
            empty = document.createElement('div');
            empty.className = 'chart-empty';
            chartWrapper.appendChild(empty);
        }

        empty.textContent = message;

        const canvas = chartWrapper.querySelector('canvas');
        if (canvas) canvas.style.visibility = 'hidden';
    }




    function clearEmptyMessage(chartWrapper) {
        chartWrapper.querySelectorAll('.chart-empty').forEach(n => n.remove());

        const canvas = chartWrapper.querySelector('canvas');
        if (canvas) canvas.style.visibility = 'visible';
    }







    async function renderHealthChart(type = 'bar', classId = 'all', timeWindow = 'all') {
        if (healthChart) {
            healthChart.destroy();
            healthChart = null;
        }

        // 🔑 LOCK LAYOUT FIRST
        if (type === 'pie') {
            classTitle.classList.remove('hidden');
        } else {
            classTitle.classList.add('hidden');
        }

        clearEmptyMessage(healthWrapper);


        // If pie -> ask for summary for the selected class
        if (type === 'pie') {
            currentHealthType = 'pie';
            classTitle.classList.remove('hidden');
            const res = await fetch(`/charts/classes/class_health_summary?class_id=${classId}&time_window=${timeWindow}`);
            const data = await res.json();
       
  

            if (data.empty) {
                showEmptyMessage(
                    healthWrapper,
                    "Start logging assignments to see this graph."
                );
                return;
            }


            const total = data.total || (data.completed_count + data.in_progress_count + data.not_started_count);

            const values = [
                data.completed_pct,
                data.in_progress_pct,
                data.not_started_pct
            ];

            console.log(values)
            // Set title
            if (classId === 'all') classTitle.textContent = 'All classes';
            else classTitle.textContent = data.class_name || 'Class';

            healthChart = new Chart(healthCtx, {
                type: 'pie',
                data: {
                    labels: ['Completed', 'In Progress', 'Not Started'],
                    datasets: [{ data: values, backgroundColor: ['#22c55e', '#facc15', '#ef4444'] }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,   // 🔑 ALWAYS false
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    plugins: {
                        legend: {position: 'bottom'},
                        tooltip: {
                            callbacks: {
                                label(context) {
                                    const label = context.label;
                                    const pct = context.parsed ?? 0;

                                    let count = 0;
                                    if (label === 'Completed') count = data.completed_count;
                                    else if (label === 'In Progress') count = data.in_progress_count;
                                    else if (label === 'Not Started') count = data.not_started_count;

                                    return `${label}: ${pct}% (${count})`;
                                }
                            }
                        },
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
                showEmptyMessage(
                    healthWrapper,
                    "Start logging assignments to see this graph."
                ); 
                return;
            }
            const labels = healthData.map(c => c.class_name);
            const completedData = healthData.map(c => c.completed);
            const inProgressData = healthData.map(c => c.in_progress);
            const notStartedData = healthData.map(c => c.not_started);


            const completedCounts = healthData.map(c => c.completed_count || 0);
            const inProgressCounts = healthData.map(c => c.in_progress_count || 0);
            const notStartedCounts = healthData.map(c => c.not_started_count || 0);

            healthChart = new Chart(healthCtx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Completed', data: completedData, backgroundColor: '#22c55e', counts: completedCounts },
                        { label: 'In Progress', data: inProgressData, backgroundColor: '#facc15', counts: inProgressCounts },
                        { label: 'Not Started', data: notStartedData, backgroundColor: '#ef4444', counts: notStartedCounts }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    scales: { x: { stacked: true }, y: { stacked: true, max: 100, title: { display: true, text: 'Percentage of Assignments (%)' } } },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const pct = context.parsed.y;
                                    const count = (context.dataset.counts && context.dataset.counts[context.dataIndex]) || 0;
                                    return `${label}: ${pct}% (${count})`;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            // single-class bar (use summary endpoint)
            const res = await fetch(`/charts/classes/class_health_summary?class_id=${classId}&time_window=${timeWindow}`);
            const data = await res.json();
            if (data.empty) {
                showEmptyMessage(
                    healthWrapper,
                    "Start logging assignments to see this graph."
                );
                return;
            }

            const labels = [data.class_name || 'Class'];
            const datasets = [
                {
                    label: 'Completed',
                    data: [data.completed_pct],
                    backgroundColor: '#22c55e',
                    counts: [data.completed_count]
                },
                {
                    label: 'In Progress',
                    data: [data.in_progress_pct],
                    backgroundColor: '#facc15',
                    counts: [data.in_progress_count]
                },
                {
                    label: 'Not Started',
                    data: [data.not_started_pct],
                    backgroundColor: '#ef4444',
                    counts: [data.not_started_count]
                }
            ];


            healthChart = new Chart(healthCtx, {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 600, easing: 'easeOutCubic' },
                    scales: { x: { stacked: true }, y: { stacked: true, max: 100, title: { display: true, text: 'Percentage of Assignments (%)' } } },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label(context) {
                                    const pct = context.parsed.y;
                                    const count = context.dataset.counts?.[0] ?? 0;
                                    return `${context.dataset.label}: ${pct}% (${count})`;
                                }
                            }
                        }
                    }

                }
            });
        }
    }



    // Toggle buttons
    document.querySelectorAll('.health-widget .chart-toggle button').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.health-widget .chart-toggle button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentHealthType = btn.dataset.chart;
            await renderHealthChart(currentHealthType, classSelect?.value || 'all', timeFilter?.value || 'all');


        });
    });

    // Dropdowns
    classSelect?.addEventListener('change', async () => {
        await renderHealthChart(currentHealthType, classSelect.value, timeFilter?.value || 'all');
    });
    timeFilter?.addEventListener('change', async () => {
        await renderHealthChart(currentHealthType, classSelect?.value || 'all', timeFilter.value);
    });

    // Initial population and render
    await fetchAndPopulateClassDropdown();
    await renderHealthChart('bar', 'all', 'all');

});
