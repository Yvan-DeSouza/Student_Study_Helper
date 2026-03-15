/**
 * static/js/calendar/interaction/dragDrop.js
 *
 * Drag-and-drop lifecycle for CalendarEvent chips.
 * Only events with data-draggable="true" are draggable.
 *
 * Architecture rules (from spec):
 *   - Confirmation modal is ALWAYS required before saving.
 *   - No drag saves to the backend directly.
 *   - Optimistic update → confirm or revert.
 *   - Month view drags preserve the original time (only date changes).
 *
 * Supports:
 *   - Week/day view: pixel-based time positioning via pixelUtils
 *   - Month view:    date-cell-based positioning
 */

import { calendarState }                        from "../calendar_state.js";
import { userTimezone }                         from "../domain/time.js";
import { pixelToTime, timeToPixel, PIXELS_PER_HOUR } from "../utils/pixelUtils.js";
import { formatDateTime }                       from "../utils/timeUtils.js";
import { findConflicts }                        from "../logic/collisionEngine.js";
import { toDateString }                         from "../logic/dateMath.js";

// ─────────────────────────────────────────────────────────────
// STATE (module-level, not in calendarState)
// ─────────────────────────────────────────────────────────────

let _dragState = null;
/*
  {
    eventId:      string,
    event:        CalendarEvent,
    originalEl:   HTMLElement,
    ghostEl:      HTMLElement,
    view:         "month" | "week" | "day",
    proposedStart: string | null,   // local ISO "YYYY-MM-DDTHH:MM:SS"
    proposedEnd:   string | null,
    // week/day specific
    colEl:        HTMLElement | null,
    offsetY:      number,           // cursor offset within the chip at drag start
  }
*/

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Attach drag listeners to all draggable event chips currently in the DOM.
 * Must be called after each render that places chips.
 */
export function initDragListeners() {
  document.querySelectorAll(".cal-event-chip[data-draggable='true']").forEach(chip => {
    // Remove existing listeners first (avoid duplicates after re-render)
    chip.removeEventListener("pointerdown", _onPointerDown);
    chip.addEventListener("pointerdown", _onPointerDown, { passive: false });
  });
}

// ─────────────────────────────────────────────────────────────
// POINTER DOWN — start drag
// ─────────────────────────────────────────────────────────────

function _onPointerDown(e) {
  if (e.button !== 0) return; // left click only
  e.preventDefault();

  const chip    = e.currentTarget;
  const eventId = chip.dataset.eventId;
  const event   = calendarState.getEventById(eventId);

  if (!event || !event.draggable) return;

  const view = calendarState.getView();

  // Capture cursor offset within the chip
  const rect    = chip.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;
  const offsetX = e.clientX - rect.left;

  // Create ghost element
  const ghost = _createGhost(chip);
  document.body.appendChild(ghost);
  _moveGhost(ghost, e.clientX - offsetX, e.clientY - offsetY);

  // Apply dragging style to original
  chip.classList.add("is-dragging");

  _dragState = {
    eventId,
    event,
    originalEl:    chip,
    ghostEl:       ghost,
    view,
    proposedStart: null,
    proposedEnd:   null,
    colEl:         chip.closest(".cal-day-col") || null,
    offsetY,
    offsetX,
  };

  calendarState.setDraggingEventId(eventId);

  // Attach move and up listeners to document
  document.addEventListener("pointermove", _onPointerMove);
  document.addEventListener("pointerup",   _onPointerUp);
}

// ─────────────────────────────────────────────────────────────
// POINTER MOVE — update ghost position
// ─────────────────────────────────────────────────────────────

function _onPointerMove(e) {
  if (!_dragState) return;

  const { ghostEl, view, offsetX, offsetY } = _dragState;
  _moveGhost(ghostEl, e.clientX - offsetX, e.clientY - offsetY);

  if (view === "month") {
    _updateMonthDragTarget(e);
  } else {
    _updateTimeDragTarget(e);
  }
}

// ─────────────────────────────────────────────────────────────
// POINTER UP — drop
// ─────────────────────────────────────────────────────────────

function _onPointerUp(e) {
  if (!_dragState) return;

  document.removeEventListener("pointermove", _onPointerMove);
  document.removeEventListener("pointerup",   _onPointerUp);

  const { event, originalEl, ghostEl, proposedStart, proposedEnd, view } = _dragState;

  // Clean up visual state
  ghostEl.remove();
  originalEl.classList.remove("is-dragging");
  document.querySelectorAll(".cal-drag-over").forEach(el => el.classList.remove("cal-drag-over"));

  calendarState.setDraggingEventId(null);

  // No change detected → cancel silently
  if (!proposedStart || proposedStart === _localIsoFromEvent(event)) {
    _dragState = null;
    return;
  }

  // Show confirmation modal
  _showConfirmModal(event, proposedStart, proposedEnd);
  _dragState = null;
}

// ─────────────────────────────────────────────────────────────
// MONTH VIEW — compute proposed date from hovered cell
// ─────────────────────────────────────────────────────────────

function _updateMonthDragTarget(e) {
  // Find which day cell the cursor is over
  document.querySelectorAll(".cal-drag-over").forEach(el => el.classList.remove("cal-drag-over"));

  const els = document.elementsFromPoint(e.clientX, e.clientY);
  const cell = els.find(el => el.classList.contains("cal-day-cell") && el.dataset.date);

  if (!cell || cell.dataset.disabled === "true") {
    _dragState.proposedStart = null;
    return;
  }

  cell.classList.add("cal-drag-over");

  const newDateStr = cell.dataset.date;
  const event      = _dragState.event;

  // Preserve original time component — only the date changes in month view
  const originalTime = _extractTimeFromIso(event.start);
  _dragState.proposedStart = `${newDateStr}T${originalTime}`;
  _dragState.proposedEnd   = event.end
    ? `${newDateStr}T${_extractTimeFromIso(event.end)}`
    : null;
}

// ─────────────────────────────────────────────────────────────
// WEEK / DAY VIEW — compute proposed time from pixel position
// ─────────────────────────────────────────────────────────────

function _updateTimeDragTarget(e) {
  const els   = document.elementsFromPoint(e.clientX, e.clientY);
  const colEl = els.find(el => el.classList.contains("cal-day-col"));

  if (!colEl || colEl.dataset.disabled === "true") {
    _dragState.proposedStart = null;
    return;
  }

  // Compute pixel offset within the scroll area
  const scrollArea = document.querySelector(".cal-time-scroll");
  const colRect    = colEl.getBoundingClientRect();
  const scrollTop  = scrollArea ? scrollArea.scrollTop : 0;
  const pixelY     = e.clientY - colRect.top + scrollTop - _dragState.offsetY;

  const dateStr      = colEl.dataset.date;
  const proposedStart = pixelToTime(Math.max(0, pixelY), dateStr, PIXELS_PER_HOUR, 15);

  const event = _dragState.event;
  let proposedEnd = null;

  if (event.end) {
    // Preserve duration
    const startMs = new Date(event.start).getTime();
    const endMs   = new Date(event.end).getTime();
    const durMs   = endMs - startMs;
    const newStartMs = new Date(proposedStart).getTime();
    // Convert back to local ISO
    const newEndDate = new Date(newStartMs + durMs);
    proposedEnd = _toLocalIso(newEndDate, dateStr, colEl.dataset.date);
  }

  _dragState.proposedStart = proposedStart;
  _dragState.proposedEnd   = proposedEnd;
  _dragState.colEl         = colEl;
}

// ─────────────────────────────────────────────────────────────
// CONFIRMATION MODAL
// ─────────────────────────────────────────────────────────────

function _showConfirmModal(event, proposedStart, proposedEnd) {
  const modal = document.getElementById("calendarConfirmChangeModal");
  if (!modal) {
    console.warn("[DragDrop] Confirm modal not found — cannot complete drag.");
    return;
  }

  // Populate modal text
  const titleEl    = document.getElementById("drag-confirm-event-title");
  const oldTimeEl  = document.getElementById("drag-confirm-old-time");
  const newTimeEl  = document.getElementById("drag-confirm-new-time");

  if (titleEl)   titleEl.textContent  = event.title;
  if (oldTimeEl) oldTimeEl.textContent = formatDateTime(event.start, userTimezone);
  if (newTimeEl) newTimeEl.textContent = formatDateTime(proposedStart, userTimezone);

  // Check for conflicts (informational)
  const conflicts = findConflicts(event.id, proposedStart, proposedEnd, calendarState.getEvents());
  const warningEl = document.getElementById("drag-confirm-conflict-warning");
  if (warningEl) {
    warningEl.style.display = conflicts.length > 0 ? "" : "none";
    warningEl.textContent   = conflicts.length > 0
      ? `⚠ This overlaps ${conflicts.length} other session(s).`
      : "";
  }

  // Show modal
  modal.classList.remove("hidden");
  modal.classList.add("visible", "modal-top");

  // Wire confirm button
  const confirmBtn = document.getElementById("btn-confirm-drag");
  const cancelBtn  = document.getElementById("btn-cancel-drag");

  const onConfirm = () => {
    _cleanup(confirmBtn, cancelBtn, onConfirm, onCancel, modal);
    _executeDragSave(event, proposedStart, proposedEnd);
  };

  const onCancel = () => {
    _cleanup(confirmBtn, cancelBtn, onConfirm, onCancel, modal);
  };

  confirmBtn?.addEventListener("click", onConfirm, { once: true });
  cancelBtn?.addEventListener("click",  onCancel,  { once: true });
}

function _cleanup(confirmBtn, cancelBtn, onConfirm, onCancel, modal) {
  confirmBtn?.removeEventListener("click", onConfirm);
  cancelBtn?.removeEventListener("click",  onCancel);
  modal.classList.remove("visible", "modal-top");
  modal.classList.add("hidden");
}

// ─────────────────────────────────────────────────────────────
// EXECUTE SAVE — optimistic update + API call
// ─────────────────────────────────────────────────────────────

async function _executeDragSave(event, proposedStart, proposedEnd) {
  // Import here to avoid circular deps
  const { moveEvent } = await import("../calendar_service.js");

  try {
    await moveEvent(event.id, proposedStart, proposedEnd, userTimezone);
  } catch (err) {
    console.error("[DragDrop] Move failed:", err);
    // calendarService handles the revert automatically
  }
}

// ─────────────────────────────────────────────────────────────
// GHOST ELEMENT
// ─────────────────────────────────────────────────────────────

function _createGhost(sourceEl) {
  const ghost = sourceEl.cloneNode(true);
  const rect  = sourceEl.getBoundingClientRect();

  ghost.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 99999;
    opacity: 0.75;
    width: ${rect.width}px;
    transform: scale(1.04);
    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    transition: none;
  `;
  ghost.id = "cal-drag-ghost";
  return ghost;
}

function _moveGhost(ghost, x, y) {
  ghost.style.left = `${x}px`;
  ghost.style.top  = `${y}px`;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Extract "HH:MM:SS" from an ISO string using Intl (timezone-aware). */
function _extractTimeFromIso(isoString) {
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-CA", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: userTimezone,
  }).formatToParts(date);

  const h = parts.find(p => p.type === "hour")?.value   || "00";
  const m = parts.find(p => p.type === "minute")?.value || "00";
  const s = parts.find(p => p.type === "second")?.value || "00";
  return `${h}:${m}:${s}`;
}

/** Return the local "YYYY-MM-DDTHH:MM:SS" ISO string for a JS Date. */
function _toLocalIso(date, _unused, _unused2) {
  const pad  = n => String(n).padStart(2, "0");
  const y    = date.getFullYear();
  const mo   = date.getMonth() + 1;
  const d    = date.getDate();
  const h    = date.getHours();
  const mi   = date.getMinutes();
  const s    = date.getSeconds();
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
}

/** Get the event's current start as a local ISO string (for change-detection). */
function _localIsoFromEvent(event) {
  if (!event.start) return "";
  const date = new Date(event.start);
  return _toLocalIso(date);
}