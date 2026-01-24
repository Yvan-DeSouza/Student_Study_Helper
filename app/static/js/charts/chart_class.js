import { gateChart } from './chart_gatekeeper.js';
import { registerRefresh } from "../core/refreshBus.js";

let scatterChart = null;
let healthChart = null;

document.addEventListener("DOMContentLoaded", async () => {

    document.addEventListener("charts:refresh", async () => {
        // Destroy existing charts
        if (scatterChart) scatterChart.destroy();
        if (healthChart) healthChart.destroy();
        
        scatterChart = null;
        healthChart = null;
        
        // Re-render charts
        await fetchAndPopulateClassDropdown();
        await renderHealthChart('bar', 'all', 'all');
        
        // Re-fetch scatter
        const scatterRes = await fetch("/charts/classes/grade_vs_study_time");
        const scatterData = await scatterRes.json();
        const scatterCard = document.querySelector('.scatter-card');

        if (gateChart(scatterCard, scatterData, renderGradeVsStudyFront, renderGradeVsStudyBack)) {
            renderScatter(scatterData);
        }
    });

    // =================== RENDER FUNCTIONS ===================
    
    function renderGradeVsStudyFront(progress) {
        const hasGrades = progress.classes_with_grade.current >= progress.classes_with_grade.required;
        const hasSessions = progress.completed_study_sessions_total.current >= progress.completed_study_sessions_total.required;
        const hasBoth = progress.classes_with_both.current >= 1;
        
        if (!hasGrades && !hasSessions) {
            return `
                <div class="chart-empty">
                    <p><strong>Not enough data yet</strong></p>
                    <p>Add grades and complete study sessions for one of your classes to compare effort vs results.</p>
                </div>
            `;
        }
        
        if (hasGrades && !hasSessions) {
            return `
                <div class="chart-empty">
                    <p><strong>Not enough data yet</strong></p>
                    <p>Complete at least one study session to see how effort relates to grades.</p>
                </div>
            `;
        }
        
        if (!hasGrades && hasSessions) {
            return `
                <div class="chart-empty">
                    <p><strong>Not enough data yet</strong></p>
                    <p>Give at least one grade to a class to see how effort relates to grades.</p>
                </div>
            `;
        }
        
        if (hasGrades && hasSessions && !hasBoth) {
            return `
                <div class="chart-empty">
                    <p><strong>Not enough data yet</strong></p>
                    <p>Give at least one grade and complete at least one study session for one class to compare effort vs results.</p>
                </div>
            `;
        }
        
        return `
            <div class="chart-empty">
                <p><strong>Not enough data yet</strong></p>
                <ul>
                    <li>
                        Classes with grades:
                        ${progress.classes_with_grade.current}/${progress.classes_with_grade.required}
                        ${progress.classes_with_grade.current >= progress.classes_with_grade.required ? "✅" : "❌"}
                    </li>
                    <li>
                        Total completed study sessions:
                        ${progress.completed_study_sessions_total.current}/${progress.completed_study_sessions_total.required}
                        ${progress.completed_study_sessions_total.current >= progress.completed_study_sessions_total.required ? "✅" : "❌"}
                    </li>
                </ul>
            </div>
        `;
    }

    function renderGradeVsStudyBack(ineligibleClasses) {
        return `
            <p><strong>Why some classes aren't shown:</strong></p>
            <ul>
                ${ineligibleClasses.map(c =>
                    `<li><strong>${c.class_name}</strong>: ${c.reasons.join(", ")}</li>`
                ).join("")}
            </ul>
        `;
    }

    function renderClassHealthFront(progress) {
        if (progress.assignments_total.current === 0) {
            return `
                <div class="chart-empty">
                    <p><strong>Not enough data yet</strong></p>
                    <p>Start logging assignments to see class health.</p>
                </div>
            `;
        }
        
        if (progress.time_window !== 'all') {
            return `
                <div class="chart-empty">
                    <p><strong>No assignments in this time range</strong></p>
                    <p>Try switching to <strong>All time</strong>.</p>
                </div>
            `;
        }
        
        return `
            <div class="chart-empty">
                <p><strong>Not enough data yet</strong></p>
                <ul>
                    <li>
                        Total assignments:
                        ${progress.assignments_total.current}/${progress.assignments_total.required}
                        ${progress.assignments_total.current >= progress.assignments_total.required ? "✅" : "❌"}
                    </li>
                </ul>
            </div>
        `;
    }

    function renderClassHealthBack(ineligibleClasses) {
        return `
            <p><strong>Why some classes aren't shown:</strong></p>
            <ul>
                ${ineligibleClasses.map(c =>
                    `<li><strong>${c.class_name}</strong>: ${c.reasons.join(", ")}</li>`
                ).join("")}
            </ul>
        `;
    }

    // ===============================
    // Populate Class Dropdown
    // ===============================
    const classSelect = document.getElementById("classHealthSelect");

    function populateClassDropdownDOM(classes) {
        if (!classSelect) return;
        classSelect.innerHTML = '<option value="all">All</option>' + 
            classes.map(c => `<option value="${c.class_id}">${c.class_name}</option>`).join('');
    }

    // ===============================
    // Grade vs Study Time Scatter
    // ===============================
    const scatterCanvas = document.getElementById("gradeStudyScatter");
    const scatterCard = document.querySelector('[data-card-id="class-scatter"]');
    const scatterCtx = scatterCanvas.getContext("2d");

    const scatterRes = await fetch("/charts/classes/grade_vs_study_time");
    const scatterData = await scatterRes.json();

    if (gateChart(scatterCard, scatterData, renderGradeVsStudyFront, renderGradeVsStudyBack)) {
        renderScatter(scatterData);
    }
    function renderScatter(scatterData) {
        if (scatterChart) {
            scatterChart.destroy();
            scatterChart = null;
        }

        const scatterWrapper = scatterCard.querySelector('.chart-wrapper');

        scatterChart = new Chart(scatterCtx, {
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
        scatterWrapper.style.height = scatterChart.height + 'px';
    }

    // ===============================
    // Class Health Breakdown (Pie ↔ Bar)
    // ===============================
    const healthCtx = document.getElementById("classHealthGraph").getContext("2d");
    const healthCard = document.querySelector('[data-card-id="class-health"]');
    const healthWrapper = document.getElementById('classHealthGraph').parentElement;
    const timeFilter = document.getElementById('classHealthTimeFilter');
    const classTitle = document.getElementById('classHealthTitle');

    let healthChart = null;
    let currentHealthType = 'bar';
    let currentEligibility = null;

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

            // Check eligibility on first load
            if (!currentEligibility) {
                currentEligibility = data.eligibility;
                const isEligible = gateChart(healthCard, data, renderClassHealthFront, renderClassHealthBack);
                if (!isEligible) {
                    return;
                }
            }

            if (data.empty) {
                showEmptyMessage(healthWrapper, "Start logging assignments to see this graph.");
                return;
            }

            const values = [
                data.completed_pct,
                data.in_progress_pct,
                data.not_started_pct
            ];

            // Set title
            classTitle.textContent = data.class_name || 'Class';

            healthChart = new Chart(healthCtx, {
                type: 'pie',
                data: {
                    labels: ['Completed', 'In Progress', 'Not Started'],
                    datasets: [{ data: values, backgroundColor: ['#22c55e', '#facc15', '#ef4444'] }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
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
            healthWrapper.style.height = healthChart.height + 'px';
            return;
        }

        // Bar mode
        currentHealthType = 'bar';
        classTitle.classList.add('hidden');

        if (classId === 'all') {
            const res = await fetch(`/charts/classes/class_health?time_window=${timeWindow}`);
            const healthData = await res.json();

            // Check eligibility on first load
            if (!currentEligibility) {
                currentEligibility = healthData.eligibility;
                const isEligible = gateChart(healthCard, healthData, renderClassHealthFront, renderClassHealthBack);
                if (!isEligible) {
                    return;
                }
            }

            if (!healthData || !healthData.data || healthData.data.length === 0) {
                showEmptyMessage(healthWrapper, "Start logging assignments to see this graph.");
                return;
            }

            const labels = healthData.data.map(c => c.class_name);
            const completedData = healthData.data.map(c => c.completed);
            const inProgressData = healthData.data.map(c => c.in_progress);
            const notStartedData = healthData.data.map(c => c.not_started);

            const completedCounts = healthData.data.map(c => c.completed_count || 0);
            const inProgressCounts = healthData.data.map(c => c.in_progress_count || 0);
            const notStartedCounts = healthData.data.map(c => c.not_started_count || 0);

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
            healthWrapper.style.height = healthChart.height + 'px';
        } else {
            // single-class bar (use summary endpoint)
            const res = await fetch(`/charts/classes/class_health_summary?class_id=${classId}&time_window=${timeWindow}`);
            const data = await res.json();

            if (data.empty) {
                showEmptyMessage(healthWrapper, "Start logging assignments to see this graph.");
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
            healthWrapper.style.height = healthChart.height + 'px';
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

    registerRefresh("charts", async () => {
        await fetchAndPopulateClassDropdown();
        await renderHealthChart(
            currentHealthType,
            classSelect?.value || "all",
            timeFilter?.value || "all"
        );

        // Re-fetch scatter
        const scatterRes = await fetch("/charts/classes/grade_vs_study_time");
        const scatterData = await scatterRes.json();

        if (gateChart(scatterCard, scatterData, renderGradeVsStudyFront, renderGradeVsStudyBack)) {
            renderScatter(scatterData);
        }
    });



});
