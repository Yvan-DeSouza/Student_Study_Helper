/**
 * static/js/calendar/modals/calendar_overflow_modal.js
 *
 * Shared overflow modal for both month and week views.
 * Shows the list of hidden events with type info.
 * Clicking any event in the list opens the event details modal.
 */

import { userTimezone } from "../domain/time.js";
import { formatTime }   from "../utils/timeUtils.js";
// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

/**
 * Open the overflow modal with a list of hidden events.
 *
 * @param {CalendarEvent[]} events  Events NOT shown on the grid
 * @param {string}          label   Context label, e.g. "March 22" or "Tuesday 3 PM"
 */
export function openOverflowModal(events, label) {
  const modal = document.getElementById("calendarEventsOverflowModal");
  if (!modal) return;

  _setText("overflow-modal-label", label || "Hidden events");
  _buildList(events);

  modal.classList.remove("hidden");
  modal.classList.add("visible", "modal-top");
}

/**
 * Wire close-button listeners. Call once on page load.
 */
export function initOverflowModal() {
  const modal = document.getElementById("calendarEventsOverflowModal");
  if (!modal) return;

  modal.addEventListener("click", e => {
    if (e.target === modal || e.target.closest("[data-close-modal]")) {
      _close(modal);
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
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

  const ENTITY_LABELS = {
    assignment:    "Assignment",
    study_session: "Session",
    class:         "Class",
  };
  const LIFECYCLE_LABELS = {
    due:       "Due",
    scheduled: "Scheduled",
    active:    "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    created:   "Added",
    finished:  "Done",
  };

  events.forEach(event => {
    const item = document.createElement("div");
    item.className = "overflow-event-item";

    // Coloured dot
    const dot = document.createElement("span");
    dot.className = "overflow-event-dot";
    dot.style.background = event.color || "#6366f1";

    // Event info
    const info = document.createElement("div");
    info.className = "overflow-event-info";

    const titleEl = document.createElement("span");
    titleEl.className   = "overflow-event-title";
    titleEl.textContent = event.title;

    const metaEl = document.createElement("span");
    metaEl.className   = "overflow-event-meta";
    const entityLabel  = ENTITY_LABELS[event.entity_type] || event.entity_type;
    const stateLabel   = LIFECYCLE_LABELS[event.lifecycle_type] || "";
    const timeLabel    = (!event.all_day && event.start)
      ? formatTime(event.start, userTimezone)
      : "";
    metaEl.textContent = [entityLabel, stateLabel, timeLabel].filter(Boolean).join(" · ");

    info.appendChild(titleEl);
    info.appendChild(metaEl);
    item.appendChild(dot);
    item.appendChild(info);

    // Click → open details modal
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
  if (el) el.textContent = text;
}