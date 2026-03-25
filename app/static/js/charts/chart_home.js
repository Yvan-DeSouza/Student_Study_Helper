import { gateChart } from './chart_gatekeeper.js';


let timePerClassChart = null;
let weeklyStudyChart = null;
let efficiencyChart = null;
function resetChart(chartRef, canvasId) {
    if (chartRef) {
        chartRef.destroy();
        chartRef = null;
    }

    const canvas = document.getElementById(canvasId);
    if (canvas) {
        canvas.style.display = "block";
    }

    return null;
}

function setAssignmentToggleVisibility(visible) {
    if (!loadDailyBtn || !loadWeeklyBtn) return;

    const toggleWrapper = loadDailyBtn.closest(".chart-toggle");
    if (!toggleWrapper) return;

    toggleWrapper.style.display = visible ? "flex" : "none";
}

    function  renderTimeDistributionFront(progress){
        return `
            <div class="chart-empty">
                <p><strong>Not enough data yet</strong></p>
                <ul>
                    <li>
                        Completed study sessions:
                        ${progress.completed_study_sessions_total.current}/${progress.completed_study_sessions_total.required}
                        ${progress.completed_study_sessions_total.current >= progress.completed_study_sessions_total.required ? "✅" : "❌"}
                    </li>
                    <li>
                        Classes with study time:
                        ${progress.classes_with_study_time.current}/${progress.classes_with_study_time.required}
                        ${progress.classes_with_study_time.current >= progress.classes_with_study_time.required ? "✅" : "❌"}
                    </li>
                </ul>
            </div>
        `;
    }


    function renderTimeDistributionBack(ineligibleClasses) {
        return `
            <p><strong>Why some classes aren't shown:</strong></p>
            <ul>
                ${ineligibleClasses.map(c =>
                    `<li><strong>${c.class_name}</strong>: ${c.reasons.join(", ")}</li>`
                ).join("")}
            </ul>
        `;
    }


    function renderWeeklyStudyFront(progress) {
        return `
            <div class="chart-empty">
                <p><strong>Not enough data yet</strong></p>
                <ul>
                    <li>
                        Study sessions in last 7 days:
                        ${progress.sessions_in_last_7_days.current}/${progress.sessions_in_last_7_days.required}
                        ${progress.sessions_in_last_7_days.current >= progress.sessions_in_last_7_days.required ? "✅" : "❌"}
                    </li>
                </ul>
                <p><em>Study consistently over the week to unlock your trend.</em></p>
            </div>
        `;
    }


    function renderAssignmentLoadFront(progress) {
        const noIncomplete = progress.incomplete_assignments_with_due.current === 0;
        const hasWithoutDue = progress.incomplete_assignments_without_due.current > 0;
       
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
                        ${progress.incomplete_assignments_with_due.current >= progress.incomplete_assignments_with_due.required ? "✅" : "❌"}
                    </li>
                </ul>
            </div>
        `;
    }


    function renderAssignmentLoadBack(progress) {
        if (progress.incomplete_assignments_without_due.current > 0) {
            return `
                <p><strong>Note:</strong></p>
                <p>You have ${progress.incomplete_assignments_without_due.current} incomplete assignment(s) with no due date that are not shown.</p>
            `;
        }
        return null;
    }


    function renderPerformanceRadarFront(progress) {
        return `
            <div class="chart-empty">
                <p><strong>Not enough data yet</strong></p>
                <ul>
                    <li>
                        Classes:
                        ${progress.classes.current}/${progress.classes.required}
                        ${progress.classes.current >= progress.classes.required ? "✅" : "❌"}
                    </li>
                    <li>
                        Classes with study sessions or grades:
                        ${progress.study_sessions_or_grades.current}/${progress.study_sessions_or_grades.required}
                        ${progress.study_sessions_or_grades.current >= progress.study_sessions_or_grades.required ? "✅" : "❌"}
                    </li>
                </ul>
            </div>
        `;
    }


    function renderPerformanceRadarBack(ineligibleClasses) {
        return `
            <p><strong>Why some classes aren't shown:</strong></p>
            <ul>
                ${ineligibleClasses.map(c =>
                    `<li><strong>${c.class_name}</strong>: ${c.reasons.join(", ")}</li>`
                ).join("")}
            </ul>
        `;
    }


    /* ========= TIME PER CLASS ========= */
    async function renderTimePerClass() {
        const canvas = document.getElementById("timePerClassChart");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const card = document.querySelector('[data-card-id="home-time-per-class"]');

        const res = await fetch("/charts/home/time_per_class");
        const data = await res.json();

        const allowed = gateChart(
            card,
            data,
            renderTimeDistributionFront,
            renderTimeDistributionBack
        );

        if (!allowed) {
            timePerClassChart = resetChart(timePerClassChart, "timePerClassChart");
            return;
        }

        timePerClassChart = resetChart(timePerClassChart, "timePerClassChart");


        timePerClassChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.data,
                    backgroundColor: data.colors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const hours = (ctx.raw / 60).toFixed(1);
                                return `${ctx.label}: ${hours}h`;
                            }
                        }
                    }
                }
            }
        });
    }




    /* ========= WEEKLY STUDY TIME ========= */
    async function renderWeeklyStudy() {
        const canvas = document.getElementById("weeklyStudyTime");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const card = document.querySelector('[data-card-id="home-weekly-study"]');

        const res = await fetch("/charts/home/weekly_study_time");
        const data = await res.json();

        const allowed = gateChart(card, data, renderWeeklyStudyFront, null);

        if (!allowed) {
            weeklyStudyChart = resetChart(weeklyStudyChart, "weeklyStudyTime");
            return;
        }

        weeklyStudyChart = resetChart(weeklyStudyChart, "weeklyStudyTime");


        weeklyStudyChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Study Time (hours)",
                    data: data.data.map(m => m / 60), // convert minutes → hours
                    tension: 0.3,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Hours"
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.raw.toFixed(1)}h`
                        }
                    }
                }
            }
        });
    }




    /* ========= ASSIGNMENT LOAD ========= */
    const assignmentCtx = document.getElementById("assignmentLoad")?.getContext("2d");
    const assignmentCard = document.querySelector('[data-card-id="home-assignment-load"]');
    const loadDailyBtn = document.getElementById("loadDailyBtn");
    const loadWeeklyBtn = document.getElementById("loadWeeklyBtn");


    let assignmentChart;






    async function loadAssignmentChart(mode = "daily") {

        const canvas = document.getElementById("assignmentLoad");
        if (!canvas) return;



        const ctx = canvas.getContext("2d");

        const url = mode === "daily"
            ? "/charts/home/assignment_load_daily"
            : "/charts/home/assignment_load_weekly";

        const res = await fetch(url);
        const data = await res.json();

        const allowed = gateChart(
            assignmentCard,
            data,
            renderAssignmentLoadFront,
            renderAssignmentLoadBack
        );

        setAssignmentToggleVisibility(allowed);

        if (!allowed) {

            assignmentChart = resetChart(assignmentChart, "assignmentLoad");
            return;
        }

        canvas.style.display = "block";


        assignmentChart = resetChart(assignmentChart, "assignmentLoad");
        assignmentChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Assignments Due",
                    data: data.data,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

    }


    if (assignmentCtx){
        /* Initial load */


        if (assignmentCtx && loadDailyBtn && loadWeeklyBtn) {

            loadDailyBtn.addEventListener("click", () => {
                loadDailyBtn.classList.add("active");
                loadWeeklyBtn.classList.remove("active");
                loadAssignmentChart("daily");
            });

            loadWeeklyBtn.addEventListener("click", () => {
                loadWeeklyBtn.classList.add("active");
                loadDailyBtn.classList.remove("active");
                loadAssignmentChart("weekly");
            });
        }

    }


    /* ========= STUDY EFFICIENCY BY CLASS ========= */
    async function renderStudyEfficiency() {
        const canvas = document.getElementById("StudyEffByCls");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const card = document.querySelector('[data-card-id="home-performance"]');

        const res = await fetch("/charts/home/study_efficiency_by_class");
        const data = await res.json();

        const allowed = gateChart(
            card,
            data,
            renderPerformanceRadarFront,
            renderPerformanceRadarBack
        );

        if (!allowed) {
            efficiencyChart = resetChart(efficiencyChart, "StudyEffByCls");
            return;
        }

        efficiencyChart = resetChart(efficiencyChart, "StudyEffByCls");


        efficiencyChart = new Chart(ctx, {
            type: "radar",
            data: {
                labels: data.axes,
                datasets: data.datasets.map(cls => ({
                    label: cls.label,
                    data: cls.values,
                    borderColor: cls.color,
                    backgroundColor: cls.color + "33", // translucent fill
                    borderWidth: 2,
                    pointRadius: 3,
                    raw: cls.raw
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: "bottom"
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                const axis = ctx.label;
                                const raw = ctx.dataset.raw;


                                switch (axis) {
                                    case "Study Time":
                                        return `${ctx.dataset.label}: ${raw.study_minutes} min`;
                                    case "Avg Grade":
                                        return `${ctx.dataset.label}: ${raw.avg_grade.toFixed(1)}%`;
                                    case "Completion Rate":
                                        return `${ctx.dataset.label}: ${raw.completion_rate.toFixed(1)}%`;
                                    case "Importance":
                                        return `${ctx.dataset.label}: ${raw.importance || "None"}`;
                                    case "Difficulty":
                                        return `${ctx.dataset.label}: ${raw.difficulty || 0}/10`;
                                    default:
                                        return ctx.formattedValue;
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    await initHomeCharts();




    async function initHomeCharts() {
        await renderTimePerClass();
        await renderWeeklyStudy();
        await loadAssignmentChart("daily");
        await renderStudyEfficiency();
    }


    // Refresh listener
    document.addEventListener("home:charts:refresh", initHomeCharts);









