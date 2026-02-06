
import { getColumnDescription, buildRequirementExplanation } from "../core/columnPolicy.js";

export function renderTableHeader(columnStates) {
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");

    for (const col of columnStates) {
        const th = document.createElement("th");
        
        // Column label
        const labelSpan = document.createElement("span");
        labelSpan.textContent = col.label;
        th.appendChild(labelSpan);

        // Lock icon for locked columns
        if (col.locked) {
            th.classList.add("locked-column");
            const lockIcon = document.createElement("span");
            lockIcon.textContent = " 🔒";
            lockIcon.style.opacity = "0.6";
            th.appendChild(lockIcon);
        }

        // Hint icon for all columns
        const hintIcon = document.createElement("span");
        hintIcon.className = "hint-icon";
        hintIcon.textContent = "?";
        
        // Build hint content
        let hintText = getColumnDescription(col.key);
        
        if (col.locked && col.lockReason) {
            hintText += "\n\n🔒 Locked - Requirements not met:\n" + buildRequirementExplanation(col.lockReason);
            if (col.lockReason.unlock_hint) {
                hintText += "\n\n💡 " + col.lockReason.unlock_hint;
            }
        }
        
        hintIcon.dataset.hint = hintText;
        th.appendChild(hintIcon);

        if (col.sortable) {
            th.classList.add("sortable");
        }

        tr.appendChild(th);
    }

    thead.appendChild(tr);
    return thead;
}