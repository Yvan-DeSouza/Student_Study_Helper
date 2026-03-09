/**
 * static/js/calendar/domain/time.js
 *
 * Frontend timezone configuration. Read ONCE from the HTML data attributes
 * that calendar_page_routes.py injected, then exported as module-level
 * constants so every other module can import without re-reading the DOM.
 *
 * This is the single source of truth for the user's timezone on the frontend,
 * mirroring time_service.py on the backend.
 */

const root = document.getElementById("calendar-root");

/** IANA timezone string, e.g. "America/New_York" */
export const userTimezone = root?.dataset.userTimezone || "UTC";

/** ISO 8601 UTC string of when the user account was created */
export const userCreatedAt = root?.dataset.userCreatedAt || null;