// static/js/columns/renderers/tableRow.js

import { renderCell } from "./cellRenderer.js";

export function renderTableRow({
    rowData,
    columnStates,
    adapter,
}) {
    const tr = document.createElement("tr");

    adapter?.applyRowDataset(tr, rowData);

    for (const col of columnStates) {
        const cellData = rowData[col.key];
        const td = renderCell({
            columnState: col,
            cellData,
        });
        tr.appendChild(td);
    }
    console.log("Rendered row:", tr);
    adapter?.afterRowRender(tr, rowData);

    return tr;
}
