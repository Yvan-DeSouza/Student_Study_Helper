// static/js/columns/renderers/lockedCell.js

import { buildRequirementExplanation } from "../core/columnPolicy.js";

export function renderLockedCell(lockReasonOrData) {
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
    
    // Handle both user-level and assignment-level lock reasons
    let hintText = "This cell is locked because requirements aren't met.";
    
    if (lockReasonOrData) {
        // Assignment-level lock reason (from cellData.lock_reason)
        if (lockReasonOrData.message) {
            hintText = lockReasonOrData.message;
            
            if (lockReasonOrData.blocking_reasons && lockReasonOrData.blocking_reasons.length > 0) {
                hintText += "\n\nRequirements:\n";
                for (const reason of lockReasonOrData.blocking_reasons) {
                    const metric = reason.metric || "unknown";
                    const current = reason.current ?? "N/A";
                    const required = reason.required ?? "N/A";
                    
                    const metricNames = {
                        "due_date": "Due date",
                        "completion_status": "Completion status",
                        "study_minutes": "Study time",
                        "estimated_minutes": "Time estimate",
                        "same_type_graded_assignments": "Similar graded assignments",
                        "days_until_due": "Days until due"
                    };
                    
                    const displayName = metricNames[metric] || metric;
                    hintText += `\n${displayName}: ${current} / ${required}`;
                }
            }
        }
        // User-level lock reason (from columnState.lockReason)
        else if (lockReasonOrData.unlock_hint) {
            hintText = lockReasonOrData.unlock_hint;
            
            if (lockReasonOrData.blocking_reasons && lockReasonOrData.blocking_reasons.length > 0) {
                hintText += "\n\nRequirements:\n" + buildRequirementExplanation(lockReasonOrData);
            }
        }
    }
    
    hintIcon.dataset.hint = hintText;
    td.appendChild(hintIcon);

    return td;
}