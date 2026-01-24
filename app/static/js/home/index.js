import { initModalEvents } from "../core/modalManager.js";
import { initAddClassModal } from "../classes/modals/add_class.js";

// Refresh bus
import { registerRefresh } from "../core/refreshBus.js";

// Home refresh handlers
import { refreshHomeCharts } from "./refresh/refresh_charts.js";
import { refreshHomeAssignments } from "./refresh/refresh_assignments.js";
import { refreshHomeSessions } from "./refresh/refresh_sessions.js";

document.addEventListener("DOMContentLoaded", () => {
    initModalEvents();
    initAddClassModal();

    registerRefresh("home:charts", refreshHomeCharts);
    registerRefresh("home:assignments", refreshHomeAssignments);
    registerRefresh("home:sessions", refreshHomeSessions);

    document.dispatchEvent(new CustomEvent("home:charts:refresh"));
});

