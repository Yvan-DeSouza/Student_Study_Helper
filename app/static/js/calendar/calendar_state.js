/**
 * static/js/calendar/calendar_state.js
 *
 * The single source of truth for all mutable calendar UI state.
 * Exposes getters and setters. Notifies subscribers when state changes
 * via a simple pub/sub pattern (no external dependencies).
 *
 * Key invariant: selectedDate is always a local JavaScript Date object.
 * It is NOT a UTC timestamp or ISO string.
 */

// ─────────────────────────────────────────────────────────────
// INTERNAL STATE
// ─────────────────────────────────────────────────────────────

const _state = {
  currentView:     "month",
  selectedDate:    new Date(),     // local Date — not UTC
  visibleRange:    null,           // { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
  loadedEvents:    [],             // CalendarEvent[]
  isLoading:       false,
  selectedEventId: null,           // for the open details modal
  activeFilters:   null,           // Phase 5
};

// ─────────────────────────────────────────────────────────────
// PUB / SUB
// ─────────────────────────────────────────────────────────────

const _subscribers = {};

function _subscribe(event, fn) {
  if (!_subscribers[event]) _subscribers[event] = [];
  _subscribers[event].push(fn);
}

function _notify(event, data) {
  (_subscribers[event] || []).forEach(fn => fn(data));
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

export const calendarState = {

  /** Register a listener for a named state event. */
  subscribe: _subscribe,

  // ── GETTERS ──────────────────────────────────────────────

  getView()          { return _state.currentView; },
  getSelectedDate()  { return _state.selectedDate; },
  getVisibleRange()  { return _state.visibleRange; },
  getEvents()        { return _state.loadedEvents; },
  getIsLoading()     { return _state.isLoading; },
  getSelectedEventId() { return _state.selectedEventId; },
  getFilters()       { return _state.activeFilters; },

  /** Look up a single event by its ID (no API call — from in-memory cache). */
  getEventById(id) {
    return _state.loadedEvents.find(e => e.id === id) || null;
  },

  // ── SETTERS ──────────────────────────────────────────────

  /**
   * Change the current view (month | week | day | year).
   * Fires: "viewChanged"
   */
  setView(view) {
    _state.currentView = view;
    _notify("viewChanged", { view });
  },

  /**
   * Change the selected date (the date the calendar is centered on).
   * Fires: "dateChanged"
   */
  setSelectedDate(date) {
    _state.selectedDate = date;
    _notify("dateChanged", { date });
  },

  /**
   * Store the computed visible range (derived from view + date).
   * Called by calendar_service before fetching — no notification needed.
   */
  setVisibleRange(range) {
    _state.visibleRange = range;
  },

  /**
   * Store newly loaded events from the API.
   * Fires: "eventsLoaded"
   */
  setEvents(events) {
    _state.loadedEvents = events;
    _notify("eventsLoaded", { events });
  },

  /**
   * Set loading spinner state.
   * Fires: "loadingChanged"
   */
  setLoading(loading) {
    _state.isLoading = loading;
    _notify("loadingChanged", { loading });
  },

  /** Track which event's detail modal is open. */
  setSelectedEventId(id) {
    _state.selectedEventId = id;
  },

  /** Phase 5: update active filter configuration. */
  setFilters(filters) {
    _state.activeFilters = filters;
    _notify("filtersChanged", { filters });
  },
};