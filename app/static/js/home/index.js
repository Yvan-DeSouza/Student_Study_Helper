// static/js/home/index.js
import { initModalEvents } from "../core/modalManager.js";
import { registerRefresh, runRefreshes } from "../core/refreshBus.js";

// Home refresh handlers
import { refreshHomeCharts } from "./refresh/refresh_charts.js";
import { refreshHomeAssignments } from "./refresh/refresh_assignments.js";
import { refreshHomeSessions } from "./refresh/refresh_sessions.js";
import { refreshUpcomingDeadlines } from "../global_refresh/refresh_upcoming_deadlines.js";

document.addEventListener("DOMContentLoaded", () => {
    // Initialize modal system
    initModalEvents();


    // Register refresh handlers
    registerRefresh("home:charts", refreshHomeCharts);
    registerRefresh("home:assignments", refreshHomeAssignments);
    registerRefresh("home:sessions", refreshHomeSessions);
    registerRefresh("upcoming-deadlines", refreshUpcomingDeadlines);

    // Listen for class changes to refresh home page
    document.addEventListener("class:changed", async () => {
        await runRefreshes(["home:charts", "home:assignments", "home:sessions", "upcoming-deadlines"]);
    });

    // Listen for assignment changes
    document.addEventListener("assignment:changed", async () => {
        await runRefreshes(["home:charts", "home:assignments", "home:sessions", "upcoming-deadlines"]);
    });

    // Listen for study logged
    document.addEventListener("study:logged", async () => {
        await runRefreshes(["home:charts", "upcoming-deadlines"]);
    });

    // AJAX for add assignment form
    const addAssignmentForm = document.querySelector('form[action="/assignment"]');
    if (addAssignmentForm) {
        addAssignmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const response = await fetch(addAssignmentForm.action, {
                method: 'POST',
                body: new FormData(addAssignmentForm),
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const result = await response.json();
                addAssignmentForm.reset();
                document.dispatchEvent(new CustomEvent("assignment:changed"));
            } else {
                const err = await response.json();
                // Handle error
            }
        });
    }

    // AJAX for study form
    const studyForm = document.getElementById('study-session-form');
    if (studyForm) {
        studyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const response = await fetch(studyForm.action, {
                method: 'POST',
                body: new FormData(studyForm),
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                const result = await response.json();
                studyForm.reset();
                document.dispatchEvent(new CustomEvent("study:logged"));
            } else {
                // Handle
            }
        });
    }
});