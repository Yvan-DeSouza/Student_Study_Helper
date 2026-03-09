/**
 * static/js/calendar/render/eventRenderer.js
 *
 * Places CalendarEvent chips on the grid skeleton built by gridRenderer.js.
 * Reads events from state, groups them by local date, then injects DOM elements.
 *
 * MVP: Month view only.
 * Phase 3: Add week/day time-based positioning using pixelUtils + layoutEngine.
 */

import { calendarState }                     from "../calendar_state.js";
import { userTimezone }                      from "../domain/time.js";
import { getLocalDateString, formatTime }    from "../utils/timeUtils.js";
import { generateEventDomId, getEventTypeClass } from "../utils/calendarHelpers.js";

/** Max visible event chips per day cell before "+N more" appears */
const MAX_VISIBLE = 4;

/**
 * Place all loaded events onto the current grid.
 * Must be called AFTER renderGrid() has built the cell skeletons.
 */
export function renderEvents() {
  const view = calendarState.getView();

  switch (view) {
    case "month":
      _renderMonthEvents();
      break;
    // Phase 3:
    // case "week": _renderWeekEvents(); break;
    // case "day":  _renderDayEvents();  break;
    // case "year": _renderYearDots();   break;
    default:
      _renderMonthEvents();
  }
}

// ─────────────────────────────────────────────────────────────
// MONTH VIEW
// ─────────────────────────────────────────────────────────────

function _renderMonthEvents() {
  const events = calendarState.getEvents();
  console.log(`[EventRenderer] Rendering ${events.length} events on month view`);
  // Group events by local date string ("YYYY-MM-DD" in user's timezone)
  /** @type {Map<string, Object[]>} */
  const byDate = new Map();

  events.forEach(event => {
    if (!event.start) return;
    const dateStr = getLocalDateString(event.start, userTimezone);
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr).push(event);
  });
  console.log(`[EventRenderer] Grouped events by date:`, byDate);

  // Inject chips into each day cell
  byDate.forEach((dateEvents, dateStr) => {
    console.log(`[EventRenderer] Rendering ${dateEvents.length} events for date ${dateStr}`);
    const cell = document.querySelector(`.cal-day-cell[data-date="${dateStr}"]`);
    console.log(`[EventRenderer] Found cell for date ${dateStr}:`, cell);
    if (!cell || cell.dataset.disabled === "true") return;

    const slot = cell.querySelector(".cal-day-events");
    console.log(`[EventRenderer] Found slot for date ${dateStr}:`, slot);
    if (!slot) return;

    slot.innerHTML = "";

    // Sort: due events first, then by start time
    const sorted = [...dateEvents].sort(_eventSortComparator);

    const visible  = sorted.slice(0, MAX_VISIBLE);
    const overflow = sorted.length - MAX_VISIBLE;

    visible.forEach(event => {
      slot.appendChild(_buildChip(event));
    });

    if (overflow > 0) {
      const more = document.createElement("div");
      more.className = "cal-event-overflow";
      more.textContent = `+${overflow} more`;
      slot.appendChild(more);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// CHIP BUILDER
// ─────────────────────────────────────────────────────────────

function _buildChip(event) {
  const chip = document.createElement("div");
  chip.id            = generateEventDomId(event.id);
  chip.dataset.eventId = event.id;
  chip.className     = `cal-event-chip ${getEventTypeClass(event.type)}`;

  // Apply color as CSS custom property + background
  const color = event.color || "#6366f1";
  chip.style.setProperty("--event-color", color);
  chip.style.backgroundColor = color;

  // Status modifiers (visual only — no behavior changes in MVP)
  if (event.metadata?.is_completed)  chip.classList.add("is-completed");
  if (event.metadata?.is_cancelled)  chip.classList.add("is-cancelled");
  if (event.lifecycle_type === "active") chip.classList.add("is-active");

  // Title
  const title = document.createElement("span");
  title.className  = "cal-event-title";
  title.textContent = event.title;
  chip.appendChild(title);

  // Time (only for timed events — not all-day)
  if (!event.all_day && event.start) {
    const time = document.createElement("span");
    time.className  = "cal-event-time";
    time.textContent = formatTime(event.start, userTimezone);
    chip.appendChild(time);
  }

  // Click handler → opens details modal
  chip.addEventListener("click", e => {
    e.stopPropagation();
    _openDetailsModal(event.id);
  });

  return chip;
}

// ─────────────────────────────────────────────────────────────
// MODAL TRIGGER
// Dynamic import avoids a circular dependency between renderer
// and the modal module.
// ─────────────────────────────────────────────────────────────

async function _openDetailsModal(eventId) {
  const { openEventDetailsModal } = await import("../modals/calendar_event_details.js");
  openEventDetailsModal(eventId);
}

// ─────────────────────────────────────────────────────────────
// SORT
// Priority: due events first, then by start time ascending
// ─────────────────────────────────────────────────────────────

function _eventSortComparator(a, b) {
  const priority = { due: 0, scheduled: 1, active: 2, completed: 3, cancelled: 4, created: 5, finished: 6 };
  const pa = priority[a.lifecycle_type] ?? 99;
  const pb = priority[b.lifecycle_type] ?? 99;
  if (pa !== pb) return pa - pb;
  return (a.start || "").localeCompare(b.start || "");
}