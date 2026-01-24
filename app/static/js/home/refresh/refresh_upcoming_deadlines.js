import { refreshUpcomingDeadlines } from '../../global_refresh/refresh_upcoming_deadlines.js';

export async function refreshHomeUpcomingDeadlines() {
    await refreshUpcomingDeadlines('home');
}