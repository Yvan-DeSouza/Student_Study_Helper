// static/js/columns/renderers/lockedCell.js

import { getLockedTooltip } from "../core/columnPolicy.js";

export function renderLockedCell(lockReason) {
    const td = document.createElement("td");
    td.classList.add("locked-cell");

    td.textContent = "—";

    const tooltip = getLockedTooltip(lockReason);
    if (tooltip) {
        td.title = tooltip;
    }

    return td;
}
