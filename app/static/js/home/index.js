// static/js/home/index.js
import { initModalEvents } from "../core/modalManager.js";
import { registerRefresh } from "../core/refreshBus.js";

// Home refresh handlers
import { refreshHomeCharts } from "./refresh/refresh_charts.js";
import { refreshHomeAssignments } from "./refresh/refresh_assignments.js";
import { refreshHomeSessions } from "./refresh/refresh_sessions.js";

document.addEventListener("DOMContentLoaded", () => {
    // Initialize modal system
    initModalEvents();


    // Register refresh handlers
    registerRefresh("home:charts", refreshHomeCharts);
    registerRefresh("home:assignments", refreshHomeAssignments);
    registerRefresh("home:sessions", refreshHomeSessions);

    // Listen for class changes to refresh home page
    document.addEventListener("class:changed", async () => {
        await refreshHomeCharts();
        await refreshHomeAssignments();
        await refreshHomeSessions();
    });
});