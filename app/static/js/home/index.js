import { registerRefresh, unregisterRefresh } from '../core/refreshBus.js';
import { refreshHomeCharts } from './refresh/refresh_charts.js';
import { refreshHomeSessions } from './refresh/refresh_sessions.js';
import { refreshHomeAssignments } from './refresh/refresh_assignments.js';
import { refreshHomeUpcomingDeadlines } from './refresh/refresh_upcoming_deadlines.js';
import { initModalEvents } from "../core/modalManager.js";

import { initStudySessionSubmit } from './study_session_submit.js';
import { initAssignmentSubmit } from './assignment_submit.js';
document.addEventListener("DOMContentLoaded", () => {
   initModalEvents(); 
});
function registerHomeListeners() {
    console.log("[Home] Registering refresh listeners");

    registerRefresh("home:charts", refreshHomeCharts);
    registerRefresh("home:sessions", refreshHomeSessions);
    registerRefresh("home:assignments", refreshHomeAssignments);
    registerRefresh("upcoming-deadlines", () =>
        refreshHomeUpcomingDeadlines("home")
    );

    // 🚀 init submit handlers
    initStudySessionSubmit();
    initAssignmentSubmit();
}

function cleanup() {
    unregisterRefresh("home:charts");
    unregisterRefresh("home:sessions");
    unregisterRefresh("home:assignments");
    unregisterRefresh("upcoming-deadlines");
}

document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", registerHomeListeners)
    : registerHomeListeners();

window.addEventListener("beforeunload", cleanup);
