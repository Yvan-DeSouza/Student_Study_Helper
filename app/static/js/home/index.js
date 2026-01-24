import { registerRefresh, unregisterRefresh } from '../core/refreshBus.js';
import { refreshHomeCharts } from './refresh/refresh_charts.js';
import { refreshHomeSessions } from './refresh/refresh_sessions.js';
import { refreshHomeAssignments } from './refresh/refresh_assignments.js';
import { refreshHomeUpcomingDeadlines } from './refresh/refresh_upcoming_deadlines.js';
// Register all home page refresh listeners
function registerHomeListeners() {
    console.log("[Home] Registering refresh listeners");
    
    // Charts refresh
    registerRefresh("home:charts", refreshHomeCharts);
    
    // Session form refresh
    registerRefresh("home:sessions", refreshHomeSessions);
    
    // Assignment form refresh
    registerRefresh("home:assignments", refreshHomeAssignments);
    
    // Upcoming deadlines refresh (shared component)
    registerRefresh("upcoming-deadlines", refreshHomeUpcomingDeadlines);
}

// Cleanup when leaving page
function cleanup() {
    console.log("[Home] Cleaning up listeners");
    unregisterRefresh("home:charts");
    unregisterRefresh("home:sessions");
    unregisterRefresh("home:assignments");
    unregisterRefresh("upcoming-deadlines");
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerHomeListeners);
} else {
    registerHomeListeners();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);