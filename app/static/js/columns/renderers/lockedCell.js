
import { getLockedTooltip, buildRequirementExplanation } from "../core/columnPolicy.js";

export function renderLockedCell(lockReason) {
    const td = document.createElement("td");
    td.classList.add("locked-cell");

    // Placeholder with lock icon
    const content = document.createElement("span");
    content.textContent = "🔒 —";
    content.style.opacity = "0.5";
    td.appendChild(content);

    // Hint icon with detailed explanation
    const hintIcon = document.createElement("span");
    hintIcon.className = "hint-icon";
    hintIcon.textContent = "?";
    
    let hintText = "This column is locked because requirements aren't met.";
    
    if (lockReason) {
        if (lockReason.unlock_hint) {
            hintText = lockReason.unlock_hint;
        }
        
        if (lockReason.blocking_reasons && lockReason.blocking_reasons.length > 0) {
            hintText += "\n\nRequirements:\n" + buildRequirementExplanation(lockReason);
        }
    }
    
    hintIcon.dataset.hint = hintText;
    td.appendChild(hintIcon);

    return td;
}