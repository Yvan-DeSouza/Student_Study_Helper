import { fetchAssignmentColumns } from '../../columns/api/fetchColumns.js';
import { renderTableRow } from '../../columns/renderers/tableRow.js';
import { normalizeColumnState } from '../../columns/core/columnState.js';
import { assignmentAdapter } from '../../columns/adapters/assignments.js';

export async function refreshAssignmentRow({ assignmentId } = {}) {
    if (!assignmentId) return;

    console.log(`[Assignments] Refreshing row ${assignmentId}`);

    const { columns, rows } = await fetchAssignmentColumns({
        assignmentIds: [assignmentId],
        page: "assignments",
    });

    if (!rows.length) return;

    const columnStates = columns.map(normalizeColumnState);

    const newRow = renderTableRow({
        rowData: rows[0],
        columnStates,
        adapter: assignmentAdapter,
    });

    const existing = document.querySelector(
        `tr[data-assignment-id="${assignmentId}"]`
    );

    if (existing && existing.parentElement) {
        existing.parentElement.replaceChild(newRow, existing);
    }
}
