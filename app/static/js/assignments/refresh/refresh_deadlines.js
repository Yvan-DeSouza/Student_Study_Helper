import { refreshUpcomingDeadlines } from '../../global_refresh/refresh_upcoming_deadlines.js';

export async function refreshAssignmentDeadlines() {
    console.log("[Assignments] Refreshing deadlines");
    await refreshUpcomingDeadlines('assignments');
}