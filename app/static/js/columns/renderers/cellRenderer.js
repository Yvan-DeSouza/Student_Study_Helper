
import { renderLockedCell } from "./lockedCell.js";
import { getRenderHints } from "../core/registry.js";

export function renderCell({ columnState, cellData }) {
    if (cellData?.locked) {
        return renderLockedCell(columnState.lockReason);
    }

    const td = document.createElement("td");
    const { format, align } = getRenderHints(columnState.key);

    td.classList.add(`align-${align}`);
    
    // Add data-column-key attribute for dynamic selection
    td.dataset.columnKey = columnState.key;

    const value = cellData?.value;

    if (value === null || value === undefined) {
        td.textContent = "—";
        return td;
    }

    // Special rendering for completion checkbox
    if (columnState.key === "is_completed") {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("completion-checkbox");
        checkbox.checked = Boolean(value);
        td.appendChild(checkbox);
        return td;
    }

    // Date formatting
    if (columnState.key === "due_at" || columnState.key === "finished_at") {
        if (value) {
            try {
                const date = new Date(value);
                td.textContent = date.toISOString().split('T')[0];
            } catch (e) {
                td.textContent = String(value);
            }
        } else {
            td.textContent = "—";
        }
        return td;
    }

    // Boolean badge rendering
    if (columnState.key === "is_graded") {
        td.textContent = value ? "Yes" : "No";
        td.classList.add("badge-cell");
        return td;
    }

    // Assignment type badge
    if (columnState.key === "assignment_type") {
        td.textContent = String(value).charAt(0).toUpperCase() + String(value).slice(1);
        td.classList.add("badge-cell", `type-${value}`);
        return td;
    }

    // Days until due (highlight overdue)
    if (columnState.key === "days_until_due" && typeof value === "number" && value < 0) {
        td.textContent = value;
        td.style.color = "red";
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