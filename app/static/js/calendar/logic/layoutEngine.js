/**
 * static/js/calendar/logic/layoutEngine.js
 *
 * Handles the math for placing overlapping events side-by-side in day/week views.
 *
 * Algorithm:
 *   1. Sort events by start time, then source_id ascending as tiebreaker.
 *   2. Build "collision groups" — contiguous sets of events with overlapping ranges.
 *   3. Within each group, greedily assign column slots.
 *   4. Compute widthPercent / leftPercent per event from slot index.
 *
 * Returns: Map<eventId → { widthPercent, leftPercent, columnIndex, totalColumns }>
 *
 * Architecture rule from spec:
 *   "Earlier source_id within a group → smaller width and leftmost slot."
 *   (source_id used as created_at proxy since it's already sorted ascending)
 */

// ─────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────

/**
 * Compute layout for a list of events in a single time column.
 *
 * @param {CalendarEvent[]} events   All events for one day column.
 * @returns {Map<string, {widthPercent, leftPercent, columnIndex, totalColumns}>}
 */
export function computeLayout(events) {
  const result = new Map();
  if (!events || events.length === 0) return result;

  // 1. Sort by start, then source_id ascending
  const sorted = [...events].sort((a, b) => {
    const sc = (a.start || "").localeCompare(b.start || "");
    return sc !== 0 ? sc : (a.source_id || 0) - (b.source_id || 0);
  });

  // 2. Build collision groups
  const groups = _buildCollisionGroups(sorted);

  // 3. Assign columns within each group and compute layout
  for (const group of groups) {
    const { assignments, totalCols } = _assignColumns(group);

    for (const [event, col] of assignments) {
      result.set(event.id, {
        widthPercent:  100 / totalCols,
        leftPercent:   (col * 100) / totalCols,
        columnIndex:   col,
        totalColumns:  totalCols,
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// PRIVATE — COLLISION GROUPS
// ─────────────────────────────────────────────────────────────

/**
 * Split a sorted event list into contiguous overlap groups.
 *
 * Two events overlap if event B starts before event A ends.
 * A "group" is the maximal set of events connected by overlap chains.
 */
function _buildCollisionGroups(sortedEvents) {
  const groups = [];
  let currentGroup  = [];
  let groupMaxEnd   = null;   // the latest end time seen in the current group

  for (const event of sortedEvents) {
    const start = event.start || "";
    const end   = event.end   || _addMinutes(event.start, 60); // default 60-min block

    if (currentGroup.length === 0) {
      currentGroup.push(event);
      groupMaxEnd = end;
    } else if (start < groupMaxEnd) {
      // Overlaps with something in the current group
      currentGroup.push(event);
      if (end > groupMaxEnd) groupMaxEnd = end;
    } else {
      // No overlap — close the group and start a new one
      groups.push(currentGroup);
      currentGroup = [event];
      groupMaxEnd  = end;
    }
  }

  if (currentGroup.length) groups.push(currentGroup);
  return groups;
}

// ─────────────────────────────────────────────────────────────
// PRIVATE — COLUMN ASSIGNMENT
// ─────────────────────────────────────────────────────────────

/**
 * Greedily assign column slots to events in a collision group.
 *
 * Each column tracks the end time of the last event placed in it.
 * A new event goes into the first column where it fits (start >= colEnd).
 * If no column fits, a new column is created.
 *
 * @returns {{ assignments: Map<event, colIndex>, totalCols: number }}
 */
function _assignColumns(group) {
  const assignments = new Map(); // event → column index
  const colEnds     = [];        // colEnds[i] = ISO string of last event's end in col i

  for (const event of group) {
    const start = event.start || "";
    const end   = event.end   || _addMinutes(event.start, 60);

    let placed = false;
    for (let c = 0; c < colEnds.length; c++) {
      if (colEnds[c] <= start) {
        assignments.set(event, c);
        colEnds[c] = end;
        placed = true;
        break;
      }
    }

    if (!placed) {
      const newCol = colEnds.length;
      assignments.set(event, newCol);
      colEnds.push(end);
    }
  }

  return { assignments, totalCols: colEnds.length || 1 };
}

// ─────────────────────────────────────────────────────────────
// PRIVATE — HELPERS
// ─────────────────────────────────────────────────────────────

function _addMinutes(isoString, minutes) {
  if (!isoString) return "";
  return new Date(new Date(isoString).getTime() + minutes * 60_000).toISOString();
}