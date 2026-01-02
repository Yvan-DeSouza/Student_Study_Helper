document.addEventListener("DOMContentLoaded", async () => {

    /* ========= TIME PER CLASS (already working) ========= */
    const classCtx = document.getElementById("timePerClassChart").getContext("2d");
    const classRes = await fetch("/charts/home/time_per_class");
    const classData = await classRes.json();

    new Chart(classCtx, {
        type: "doughnut",
        data: {
            labels: classData.labels,
            datasets: [{
                data: classData.data,
                backgroundColor: classData.colors,
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

    /* ========= WEEKLY STUDY TIME ========= */
    const weeklyCtx = document.getElementById("weeklyStudyTime").getContext("2d");
    const weeklyRes = await fetch("/charts/home/weekly_study_time");
    const weeklyData = await weeklyRes.json();

    new Chart(weeklyCtx, {
        type: "line",
        data: {
            labels: weeklyData.labels,
            datasets: [{
                label: "Study Time (hours)",
                data: weeklyData.data.map(m => m / 60), // convert minutes → hours
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



    /* ========= ASSIGNMENT LOAD ========= */

    const assignmentCtx = document
        .getElementById("assignmentLoad")
        .getContext("2d");

    const loadDailyBtn = document.getElementById("loadDailyBtn");
    const loadWeeklyBtn = document.getElementById("loadWeeklyBtn");

    let assignmentChart;

    async function loadAssignmentChart(mode = "daily") {
        const url =
            mode === "daily"
                ? "/charts/home/assignment_load_daily"
                : "/charts/home/assignment_load_weekly";

        const res = await fetch(url);
        const chartData = await res.json();

        if (!assignmentChart) {
            assignmentChart = new Chart(assignmentCtx, {
                type: "bar",
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: "Assignments Due",
                        data: chartData.data,
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
        } else {
            assignmentChart.data.labels = chartData.labels;
            assignmentChart.data.datasets[0].data = chartData.data;
            assignmentChart.update();
        }
    }

    /* Initial load */
    loadAssignmentChart("daily");

    /* Toggle handlers */
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





    /* ========= STUDY EFFICIENCY BY CLASS ========= */

    const effCtx = document
        .getElementById("StudyEffByCls")
        .getContext("2d");

    const effRes = await fetch("/charts/home/study_efficiency_by_class");
    const effData = await effRes.json();

    const efficiencyChart = new Chart(effCtx, {
        type: "radar",
        data: {
            labels: effData.axes,
            datasets: effData.datasets.map(cls => ({
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


});
