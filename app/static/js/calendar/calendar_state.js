/**
 * static/js/calendar/calendar_state.js
 *
 * Single source of truth for all mutable calendar UI state.
 * Pub/sub notification on every setter.
 *
 * Phase 5: getFilteredEvents() applies activeFilters to loadedEvents at read time.
 * Phase 6: draggingEventId tracking.
 * Phase 7: mini picker subscribes to "dateChanged".
 */

// ─────────────────────────────────────────────────────────────
// INTERNAL STATE
// ─────────────────────────────────────────────────────────────

const _state = {
  currentView:      "month",
  selectedDate:     new Date(),
  visibleRange:     null,         // { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
  loadedEvents:     [],           // all events returned by API (unfiltered)
  isLoading:        false,
  selectedEventId:  null,         // event whose details modal is open
  draggingEventId:  null,         // Phase 6
  activeFilters:    null,         // Phase 5: filter config dict or null
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

  subscribe: _subscribe,

  // ── GETTERS ──────────────────────────────────────────────

  getView()             { return _state.currentView; },
  getSelectedDate()     { return _state.selectedDate; },
  getVisibleRange()     { return _state.visibleRange; },
  getEvents()           { return _state.loadedEvents; },
  getIsLoading()        { return _state.isLoading; },
  getSelectedEventId()  { return _state.selectedEventId; },
  getDraggingEventId()  { return _state.draggingEventId; },
  getFilters()          { return _state.activeFilters; },

  /**
   * Return events with the active filter configuration applied.
   * Phase 5: filters are applied in-memory from the already-loaded event list.
   * When filters are null, all events are returned.
   */
  getFilteredEvents() {
    const events  = _state.loadedEvents;
    const filters = _state.activeFilters;
    if (!filters) return events;
    return _applyClientFilters(events, filters);
  },

  /** Look up a single event from memory. */
  getEventById(id) {
    return _state.loadedEvents.find(e => e.id === id) || null;
  },

  // ── SETTERS ──────────────────────────────────────────────

  setView(view) {
    _state.currentView = view;
    _notify("viewChanged", { view });
  },

  setSelectedDate(date) {
    _state.selectedDate = date;
    _notify("dateChanged", { date });
  },

  setVisibleRange(range) {
    _state.visibleRange = range;
  },

  setEvents(events) {
    _state.loadedEvents = events;
    _notify("eventsLoaded", { events });
  },

  setLoading(loading) {
    _state.isLoading = loading;
    _notify("loadingChanged", { loading });
  },

  setSelectedEventId(id) {
    _state.selectedEventId = id;
  },

  setDraggingEventId(id) {
    _state.draggingEventId = id;
    _notify("draggingChanged", { id });
  },

  /**
   * Update the active filter config and notify.
   * Pass null to clear all filters.
   * Fires "filtersChanged" which causes a re-render without a new API call.
   */
  setFilters(filters) {
    _state.activeFilters = filters;
    _notify("filtersChanged", { filters });
  },
};

// ─────────────────────────────────────────────────────────────
// CLIENT-SIDE FILTER ENGINE (Phase 5)
// ─────────────────────────────────────────────────────────────

/**
 * Apply client-side filters to the in-memory event list.
 * Mirrors the server-side calendar_filters.py logic.
 *
 * Filter dimensions:
 *   showAssignments      bool
 *   showSessions         bool
 *   showClasses          bool
 *   assignmentLifecycle  string[]  e.g. ["due", "created", "finished"]
 *   sessionStates        string[]  e.g. ["scheduled", "completed"]
 *   assignmentTypes      string[]  e.g. ["homework", "exam"]
 */
function _applyClientFilters(events, filters) {
  return events.filter(event => {
    const { entity_type, lifecycle_type, metadata } = event;

    // Entity type toggles
    if (entity_type === "assignment"   && filters.showAssignments === false) return false;
    if (entity_type === "study_session" && filters.showSessions    === false) return false;
    if (entity_type === "class"        && filters.showClasses      === false) return false;

    // Assignment lifecycle filter
    if (entity_type === "assignment" && filters.assignmentLifecycle?.length) {
      if (!filters.assignmentLifecycle.includes(lifecycle_type)) return false;
    }

    // Session state filter
    if (entity_type === "study_session" && filters.sessionStates?.length) {
      if (!filters.sessionStates.includes(lifecycle_type)) return false;
    }

    // Assignment type filter
    if (entity_type === "assignment" && filters.assignmentTypes?.length) {
      const at = metadata?.assignment_type;
      if (at && !filters.assignmentTypes.includes(at)) return false;
    }

    return true;
  });
}