// static/js/columns/renderers/cellRenderer.js

import { renderLockedCell } from "./lockedCell.js";
import { getRenderHints } from "../core/registry.js";

export function renderCell({ columnState, cellData }) {
    if (cellData?.locked) {
        return renderLockedCell(columnState.lockReason);
    }

    const td = document.createElement("td");
    const { format, align } = getRenderHints(columnState.key);

    td.classList.add(`align-${align}`);

    const value = cellData?.value;

    if (value === null || value === undefined) {
        td.textContent = "—";
        return td;
    }

    switch (format) {
        case "number":
            td.textContent = value;
            break;

        case "badge":
            td.textContent = value;
            td.classList.add("badge-cell");
            break;

        default:
            td.textContent = value;
    }

    return td;
}
