/**
 * static/js/calendar/calendar_api.js
 *
 * Pure HTTP transport layer. One job: make requests and return structured data.
 * Added: saveFilters() — persists filter preferences to the backend.
 */

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

// ─────────────────────────────────────────────────────────────
// FETCH EVENTS
// ─────────────────────────────────────────────────────────────

export async function fetchEvents(start, end, filters = null) {
  try {
    let url = `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    if (filters) {
      url += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
    }

    const response = await fetch(url, {
      headers: {
        Accept:        "application/json",
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
// MOVE EVENT (drag & drop)
// ─────────────────────────────────────────────────────────────

export async function moveEvent(eventId, newStart, newEnd, timezone) {
  try {
    const response = await fetch(
      `/api/calendar/events/${encodeURIComponent(eventId)}/move`,
      {
        method:  "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken":  getCsrfToken(),
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

// ─────────────────────────────────────────────────────────────
// SAVE FILTERS
// ─────────────────────────────────────────────────────────────

/**
 * Persist the user's calendar filter preferences to the backend.
 *
 * The UserCalendarFilter table does not yet exist — the backend stub
 * returns { success: true } immediately. This call is fire-and-forget;
 * the UI updates optimistically regardless of the response.
 *
 * @param {Object} filters — the filter config from _readFilterState()
 * @returns {{ success: bool, error: string|null }}
 */
export async function saveFilters(filters) {
  try {
    const response = await fetch("/api/calendar/filters/save", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken":  getCsrfToken(),
      },
      body: JSON.stringify({ filters }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error || "Save failed" };
    }

    const data = await response.json();
    return { success: data.success, error: null };

  } catch (err) {
    return { success: false, error: err.message };
  }
}