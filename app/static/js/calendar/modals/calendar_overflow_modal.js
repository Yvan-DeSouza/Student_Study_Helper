/**
 * static/js/calendar/modals/calendar_overflow_modal.js
 *
 * Shared "hidden events" modal — opened by both the month "+N more" link
 * and the week view overflow badge.
 *
 * Shows event title, entity type, lifecycle state, and time.
 * Clicking any item closes this modal and opens the details modal.
 */

import { formatTime } from "../utils/timeUtils.js";
import { userTimezone } from "../domain/time.js";

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

/**
 * Open the overflow list modal.
 *
 * @param {CalendarEvent[]} events  The hidden events to list
 * @param {string}          label   Context label, e.g. "Tuesday, March 3"
 */
export function openOverflowModal(events, label) {
  const modal = document.getElementById("calendarEventsOverflowModal");
  if (!modal) return;

  _setText("overflow-modal-label", label || "");
  _buildList(events);

  modal.classList.remove("hidden");
  modal.classList.add("visible", "modal-top");
}

/**
 * Initialise close-button listeners. Call once from calendar.js.
 */
export function initOverflowModal() {
  const modal = document.getElementById("calendarEventsOverflowModal");
  if (!modal) return;

  modal.addEventListener("click", e => {
    if (e.target === modal || e.target.closest("[data-close-modal]")) {
      _close(modal);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// PRIVATE
// ─────────────────────────────────────────────────────────────

function _buildList(events) {
  const list = document.getElementById("overflow-modal-list");
  if (!list) return;
  list.innerHTML = "";

  const ENTITY = {
    assignment:    "Assignment",
    study_session: "Study Session",
    class:         "Class",
  };
  const LIFECYCLE = {
    due:       "Due",
    scheduled: "Scheduled",
    active:    "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    created:   "Added",
    finished:  "Completed",
  };

  events.forEach(event => {
    const item = document.createElement("div");
    item.className = "overflow-event-item";

    const dot = document.createElement("span");
    dot.className          = "overflow-event-dot";
    dot.style.background   = event.color || "#6366f1";

    const info  = document.createElement("div");
    info.className = "overflow-event-info";

    const titleEl       = document.createElement("span");
    titleEl.className   = "overflow-event-title";
    titleEl.textContent = event.title;

    const metaEl   = document.createElement("span");
    metaEl.className = "overflow-event-meta";
    const parts      = [
      ENTITY[event.entity_type]          || event.entity_type,
      LIFECYCLE[event.lifecycle_type]    || "",
      (!event.all_day && event.start)
        ? formatTime(event.start, userTimezone)
        : "",
    ].filter(Boolean);
    metaEl.textContent = parts.join(" · ");

    info.appendChild(titleEl);
    info.appendChild(metaEl);
    item.appendChild(dot);
    item.appendChild(info);

    item.addEventListener("click", async () => {
      _close(document.getElementById("calendarEventsOverflowModal"));
      const { openEventDetailsModal } = await import("./calendar_event_details.js");
      openEventDetailsModal(event.id);
    });

    list.appendChild(item);
  });
}

function _close(modal) {
  if (!modal) return;
  modal.classList.remove("visible", "modal-top");
  modal.classList.add("hidden");
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}