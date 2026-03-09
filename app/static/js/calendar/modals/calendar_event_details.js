/**
 * static/js/calendar/modals/calendar_event_details.js
 *
 * Handles the read-only event details modal that appears when any
 * calendar event chip is clicked.
 *
 * What it does:
 *   - Looks up the event in state (no new API call needed)
 *   - Populates the modal fields from event data
 *   - Shows/hides the Edit button based on event.editable
 *   - Opens the modal
 *
 * Phase 4: Wire the Edit button to the appropriate domain editor
 * (assignment_editor.js or session editor).
 */

import { calendarState }     from "../calendar_state.js";
import { formatDate, formatTime, formatDateTime } from "../utils/timeUtils.js";
import { userTimezone }      from "../domain/time.js";

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Open the event details modal for the given event ID.
 * The event must already be in calendarState.loadedEvents.
 *
 * @param {string} eventId  CalendarEvent ID, e.g. "assignment_42_due"
 */
export function openEventDetailsModal(eventId) {
  const event = calendarState.getEventById(eventId);
  if (!event) {
    console.warn("[EventDetails] Event not found in state:", eventId);
    return;
  }

  calendarState.setSelectedEventId(eventId);

  _populate(event);
  _showModal();
}

// ─────────────────────────────────────────────────────────────
// PRIVATE
// ─────────────────────────────────────────────────────────────

function _populate(event) {
  // Color bar
  const colorBar = document.getElementById("cal-modal-color-bar");
  if (colorBar) colorBar.style.backgroundColor = event.color || "#6366f1";

  // Title
  _setText("cal-modal-title", event.title);

  // Type badge
  _setText("cal-modal-type", _formatType(event.type));

  // Status badge
  const statusEl = document.getElementById("cal-modal-status");
  if (statusEl) {
    statusEl.textContent = _getStatusLabel(event);
    statusEl.className   = `cal-modal-status-badge status-${event.lifecycle_type}`;
  }

  // Date
  _setText("cal-modal-date", event.start ? formatDate(event.start, userTimezone) : "—");

  // Time
  const timeEl = document.getElementById("cal-modal-time");
  if (timeEl) {
    if (event.all_day) {
      timeEl.textContent = "All day";
    } else if (event.start) {
      timeEl.textContent = event.end
        ? `${formatTime(event.start, userTimezone)} – ${formatTime(event.end, userTimezone)}`
        : formatTime(event.start, userTimezone);
    } else {
      timeEl.textContent = "—";
    }
  }

  // Class info
  _setText("cal-modal-class", event.metadata?.class_name || "—");
  const colorDot = document.getElementById("cal-modal-class-color");
  if (colorDot) colorDot.style.backgroundColor = event.metadata?.class_color || "#ccc";

  // Entity type badge (assignment | study session)
  const entityBadge = document.getElementById("cal-modal-entity-type");
  if (entityBadge) {
    entityBadge.textContent = _formatEntityType(event.entity_type);
  }

  // Edit button visibility
  const editBtn = document.getElementById("cal-modal-edit-btn");
  if (editBtn) {
    // Phase 4: attach onClick handler to open appropriate editor
    editBtn.style.display = event.editable ? "" : "none";
    editBtn.onclick = () => _handleEdit(event);
  }
}

function _showModal() {
  const modal = document.getElementById("calendarEventDetailsModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("visible", "modal-top");
}

function _handleEdit(event) {
  // Phase 4: open the appropriate editor
  // if (event.entity_type === "assignment") { openEditAssignmentModal(...) }
  // if (event.entity_type === "study_session") { openEditSessionModal(...) }
  console.info("[EventDetails] Edit clicked for:", event.id, "— Phase 4 will wire this up.");
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function _formatType(type) {
  const labels = {
    assignment_due:      "Assignment Due",
    assignment_created:  "Assignment Added",
    assignment_finished: "Assignment Completed",
    session_scheduled:   "Study Session",
    session_active:      "Active Session",
    session_completed:   "Session Completed",
    session_cancelled:   "Session Cancelled",
    class_created:       "Class Started",
    class_finished:      "Class Finished",
  };
  return labels[type] || type;
}

function _formatEntityType(entityType) {
  const labels = {
    assignment:    "Assignment",
    study_session: "Study Session",
    class:         "Class",
  };
  return labels[entityType] || entityType;
}

function _getStatusLabel(event) {
  if (event.metadata?.is_cancelled)  return "Cancelled";
  if (event.metadata?.is_completed)  return "Completed";
  if (event.lifecycle_type === "active")    return "In Progress";
  if (event.lifecycle_type === "scheduled") return "Scheduled";
  if (event.lifecycle_type === "due")       return "Due";
  if (event.lifecycle_type === "created")   return "Added";
  return "";
}

// ─────────────────────────────────────────────────────────────
// CLOSE HANDLER INITIALIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Initialize close button listeners for the event details modal.
 * Call this once from calendar.js.
 */
export function initEventDetailsModal() {
  const modal = document.getElementById("calendarEventDetailsModal");
  if (!modal) return;

  // Close on data-close-modal button clicks
  modal.addEventListener("click", e => {
    if (e.target.closest("[data-close-modal]")) {
      modal.classList.remove("visible", "modal-top");
      modal.classList.add("hidden");
      calendarState.setSelectedEventId(null);
    }
    // Close on overlay click (click outside modal card)
    if (e.target === modal) {
      modal.classList.remove("visible", "modal-top");
      modal.classList.add("hidden");
      calendarState.setSelectedEventId(null);
    }
  });
}