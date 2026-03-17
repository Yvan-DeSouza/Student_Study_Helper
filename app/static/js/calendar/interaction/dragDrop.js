/**
 * static/js/calendar/interaction/dragDrop.js
 *
 * FIX: Pixel-to-time calculation in week/day view.
 *
 * ROOT CAUSE of wrong times:
 *   getBoundingClientRect().top is ALREADY viewport-relative,
 *   meaning it already reflects the current scroll position.
 *   The old code added scrollArea.scrollTop on top of that,
 *   doubling the scroll offset and pushing every drop time
 *   later than it should be (by exactly scrollTop minutes).
 *
 * FIX:
 *   pixelY = e.clientY - colRect.top - offsetY
 *   (no scrollTop term)
 */

import { calendarState }                          from "../calendar_state.js";
import { userTimezone }                           from "../domain/time.js";
import { pixelToTime, timeToPixel, PIXELS_PER_HOUR } from "../utils/pixelUtils.js";
import { formatDateTime }                         from "../utils/timeUtils.js";
import { findConflicts }                          from "../logic/collisionEngine.js";
import { toDateString }                           from "../logic/dateMath.js";
import { showModal, closeModal }                  from "../../core/modalManager.js";

// ─────────────────────────────────────────────────────────────
// MODULE STATE
// ─────────────────────────────────────────────────────────────

let _dragState = null;

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

export function initDragListeners() {
  document.querySelectorAll(".cal-event-chip[data-draggable='true']").forEach(chip => {
    chip.removeEventListener("pointerdown", _onPointerDown);
    chip.addEventListener("pointerdown", _onPointerDown, { passive: false });
  });
}

// ─────────────────────────────────────────────────────────────
// POINTER DOWN — begin drag
// ─────────────────────────────────────────────────────────────

function _onPointerDown(e) {
  if (e.button !== 0) return;
  e.preventDefault();

  const chip    = e.currentTarget;
  const eventId = chip.dataset.eventId;
  const event   = calendarState.getEventById(eventId);
  if (!event || !event.draggable) return;

  const view  = calendarState.getView();
  const rect  = chip.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;
  const offsetX = e.clientX - rect.left;

  const ghost = _createGhost(chip);
  document.body.appendChild(ghost);
  _moveGhost(ghost, e.clientX - offsetX, e.clientY - offsetY);

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

  document.addEventListener("pointermove", _onPointerMove);
  document.addEventListener("pointerup",   _onPointerUp);
}

// ─────────────────────────────────────────────────────────────
// POINTER MOVE
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

function _onPointerUp() {
  if (!_dragState) return;

  document.removeEventListener("pointermove", _onPointerMove);
  document.removeEventListener("pointerup",   _onPointerUp);

  const { event, originalEl, ghostEl, proposedStart, proposedEnd } = _dragState;

  ghostEl.remove();
  originalEl.classList.remove("is-dragging");
  document.querySelectorAll(".cal-drag-over").forEach(el => el.classList.remove("cal-drag-over"));
  calendarState.setDraggingEventId(null);

  // No change detected
  if (!proposedStart || proposedStart === _localIsoFromEvent(event)) {
    _dragState = null;
    return;
  }

  _showConfirmModal(event, proposedStart, proposedEnd);
  _dragState = null;
}

// ─────────────────────────────────────────────────────────────
// MONTH DRAG — only date changes, time is preserved
// ─────────────────────────────────────────────────────────────

function _updateMonthDragTarget(e) {
  document.querySelectorAll(".cal-drag-over").forEach(el => el.classList.remove("cal-drag-over"));

  const els  = document.elementsFromPoint(e.clientX, e.clientY);
  const cell = els.find(el => el.classList.contains("cal-day-cell") && el.dataset.date);

  if (!cell || cell.dataset.disabled === "true") {
    _dragState.proposedStart = null;
    return;
  }

  cell.classList.add("cal-drag-over");

  const newDateStr   = cell.dataset.date;
  const originalTime = _extractTimeFromIso(_dragState.event.start);

  _dragState.proposedStart = `${newDateStr}T${originalTime}`;
  _dragState.proposedEnd   = _dragState.event.end
    ? `${newDateStr}T${_extractTimeFromIso(_dragState.event.end)}`
    : null;
}

// ─────────────────────────────────────────────────────────────
// WEEK / DAY DRAG — pixel-to-time  ← FIX HERE
// ─────────────────────────────────────────────────────────────

function _updateTimeDragTarget(e) {
  const els   = document.elementsFromPoint(e.clientX, e.clientY);
  const colEl = els.find(el => el.classList.contains("cal-day-col"));

  if (!colEl || colEl.dataset.disabled === "true") {
    _dragState.proposedStart = null;
    return;
  }

  /**
   * FIX: getBoundingClientRect() returns the element's position relative
   * to the VIEWPORT, which already accounts for any scroll position.
   *
   * OLD (WRONG):
   *   pixelY = e.clientY - colRect.top + scrollArea.scrollTop - offsetY
   *            ← scrollTop is double-counted; colRect.top already moved
   *              by scrollTop amount when the area scrolled.
   *
   * CORRECT:
   *   pixelY = e.clientY - colRect.top - offsetY
   *
   * Example at scrollTop=300:
   *   colRect.top = containerViewportTop - 300  (column scrolled up)
   *   e.clientY - colRect.top = correct absolute position in column ✓
   *   Adding scrollTop again would overshoot by 300px → wrong time
   */
  const colRect = colEl.getBoundingClientRect();
  const pixelY  = e.clientY - colRect.top - _dragState.offsetY;

  const dateStr      = colEl.dataset.date;
  const proposedStart = pixelToTime(Math.max(0, pixelY), dateStr, PIXELS_PER_HOUR, 15);

  let proposedEnd = null;
  const { event } = _dragState;
  if (event.end) {
    const durMs      = new Date(event.end).getTime() - new Date(event.start).getTime();
    const newEndDate = new Date(new Date(proposedStart).getTime() + durMs);
    proposedEnd      = _toLocalIso(newEndDate);
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
    console.warn("[DragDrop] Confirm modal not found");
    return;
  }

  const titleEl   = document.getElementById("drag-confirm-event-title");
  const oldTimeEl = document.getElementById("drag-confirm-old-time");
  const newTimeEl = document.getElementById("drag-confirm-new-time");

  if (titleEl)   titleEl.textContent   = event.title;
  if (oldTimeEl) oldTimeEl.textContent = formatDateTime(event.start, userTimezone);
  if (newTimeEl) newTimeEl.textContent = formatDateTime(proposedStart, userTimezone);

  const conflicts  = findConflicts(event.id, proposedStart, proposedEnd, calendarState.getEvents());
  const warningEl  = document.getElementById("drag-confirm-conflict-warning");
  if (warningEl) {
    warningEl.style.display = conflicts.length > 0 ? "" : "none";
    warningEl.textContent   = conflicts.length > 0
      ? `⚠ This overlaps ${conflicts.length} other session(s).`
      : "";
  }

  showModal("calendarConfirmChangeModal");

  const confirmBtn = document.getElementById("btn-confirm-drag");
  const cancelBtn  = document.getElementById("btn-cancel-drag");

  const onConfirm = () => {
    _cleanup(confirmBtn, cancelBtn, onConfirm, onCancel);
    closeModal("calendarConfirmChangeModal");
    _executeDragSave(event, proposedStart, proposedEnd);
  };
  const onCancel = () => {
    _cleanup(confirmBtn, cancelBtn, onConfirm, onCancel);
    closeModal("calendarConfirmChangeModal");
  };

  confirmBtn?.addEventListener("click", onConfirm, { once: true });
  cancelBtn?.addEventListener("click",  onCancel,  { once: true });
}

function _cleanup(confirmBtn, cancelBtn, onConfirm, onCancel) {
  confirmBtn?.removeEventListener("click", onConfirm);
  cancelBtn?.removeEventListener("click",  onCancel);
}

// ─────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────

async function _executeDragSave(event, proposedStart, proposedEnd) {
  const { moveEvent } = await import("../calendar_service.js");
  try {
    await moveEvent(event.id, proposedStart, proposedEnd, userTimezone);
  } catch (err) {
    console.error("[DragDrop] Move failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// GHOST
// ─────────────────────────────────────────────────────────────

function _createGhost(src) {
  const ghost = src.cloneNode(true);
  const rect  = src.getBoundingClientRect();
  ghost.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 99999;
    opacity: 0.8;
    width: ${rect.width}px;
    transform: scale(1.04);
    box-shadow: 0 8px 24px rgba(0,0,0,0.28);
    transition: none;
    border-radius: 8px;
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

/** Extract "HH:MM:SS" from a UTC ISO string, converted to user's local timezone. */
function _extractTimeFromIso(isoString) {
  const date  = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-CA", {
    hour:     "2-digit",
    minute:   "2-digit",
    second:   "2-digit",
    hour12:   false,
    timeZone: userTimezone,
  }).formatToParts(date);

  const h = parts.find(p => p.type === "hour")?.value   || "00";
  const m = parts.find(p => p.type === "minute")?.value || "00";
  const s = parts.find(p => p.type === "second")?.value || "00";
  return `${h}:${m}:${s}`;
}

/** Return "YYYY-MM-DDTHH:MM:SS" using JS LOCAL date parts. */
function _toLocalIso(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}` +
         `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Current start of the event as local ISO (for change-detection on drop). */
function _localIsoFromEvent(event) {
  if (!event.start) return "";
  return _toLocalIso(new Date(event.start));
}