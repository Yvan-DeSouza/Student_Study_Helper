/**
 * static/js/calendar/calendar_api.js
 *
 * Pure HTTP transport layer. ONE job: make requests and return structured data.
 * Never stores data. Never renders. Never retries (retry logic lives in service).
 *
 * Always returns: { success: bool, data: any, error: string|null }
 * so callers always handle both success and failure the same way.
 */

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

// ─────────────────────────────────────────────────────────────
// FETCH EVENTS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch CalendarEvents for a date range.
 *
 * @param {string} start   "YYYY-MM-DD"
 * @param {string} end     "YYYY-MM-DD"
 * @param {Object} filters optional filter config (Phase 5)
 *
 * @returns {{ success: bool, data: CalendarEvent[]|null, error: string|null }}
 */
export async function fetchEvents(start, end, filters = null) {
  try {
    let url = `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    if (filters) {
      url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
    }

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, data: null, error: err.error || "Request failed" };
    }

    const data = await response.json();
    return { success: true, data: data.events || [], error: null };

  } catch (err) {
    console.error("[CalendarAPI] fetchEvents error:", err);
    return { success: false, data: null, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// MOVE EVENT (Phase 6 — drag & drop)
// ─────────────────────────────────────────────────────────────

/**
 * Move a calendar event to a new time via drag & drop.
 * Phase 6 only — not called in MVP.
 *
 * @param {string} eventId   full CalendarEvent ID, e.g. "assignment_42_due"
 * @param {string} newStart  local ISO datetime string
 * @param {string} newEnd    local ISO datetime string or null
 * @param {string} timezone  IANA timezone string
 *
 * @returns {{ success: bool, data: CalendarEvent|null, error: string|null }}
 */
export async function moveEvent(eventId, newStart, newEnd, timezone) {
  try {
    const response = await fetch(
      `/api/calendar/events/${encodeURIComponent(eventId)}/move`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({ new_start: newStart, new_end: newEnd, timezone }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, data: null, error: err.error || "Move failed" };
    }

    const data = await response.json();
    return { success: true, data: data.updated_event, error: null };

  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}