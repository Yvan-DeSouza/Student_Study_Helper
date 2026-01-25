import { registerRefresh, unregisterRefresh } from '../core/refreshBus.js';
import { refreshHomeCharts } from './refresh/refresh_charts.js';
import { refreshHomeSessions } from './refresh/refresh_sessions.js';
import { refreshHomeAssignments } from './refresh/refresh_assignments.js';
import { refreshHomeUpcomingDeadlines } from './refresh/refresh_upcoming_deadlines.js';
import { initModalEvents } from "../core/modalManager.js";

import { initStudySessionSubmit } from './study_session_submit.js';
import { initAssignmentSubmit } from './assignment_submit.js';
import { initClassModals } from "../classes/modals/classModal.controller.js";
import { refreshHomeClasses } from './refresh/refresh_classes.js';

document.addEventListener("DOMContentLoaded", () => {
   initModalEvents(); 
   initClassModals();
});
function registerHomeListeners() {
    console.log("[Home] Registering refresh listeners");

    registerRefresh("classes:changed", refreshHomeClasses);
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
    unregisterRefresh("classes:changed");
    unregisterRefresh("home:charts");
    unregisterRefresh("home:sessions");
    unregisterRefresh("home:assignments");
    unregisterRefresh("upcoming-deadlines");
}

document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", registerHomeListeners)
    : registerHomeListeners();

window.addEventListener("beforeunload", cleanup);
