import { renderTableHeader } from "../renderers/tableHeader.js";
import { renderTableRow } from "../renderers/tableRow.js";
import { normalizeColumnState } from "../core/columnState.js";
import { assignmentAdapter } from "../adapters/assignments.js";

export function buildAssignmentTable({
    container,
    columns,
    rows,
}) {
    container.innerHTML = "";

    const columnStates = columns.map(normalizeColumnState);

    const table = document.createElement("table");
    table.classList.add("assignments-table");

    table.appendChild(renderTableHeader(columnStates));

    const tbody = document.createElement("tbody");

    for (const row of rows) {
        const tr = renderTableRow({
            rowData: row,
            columnStates,
            adapter: assignmentAdapter,
        });
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    container.appendChild(table);
}
