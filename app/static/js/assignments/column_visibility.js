// static/js/assignments/column_visibility.js

import { emitRefresh } from '../core/refreshBus.js';
import { getColumnDescription, buildRequirementExplanation } from '../columns/core/columnPolicy.js';

/**
 * Check if risk_score column is eligible and update risk filter UI
 */
async function checkRiskFilterEligibility() {
    try {
        // Fetch column states to check risk_score eligibility
        // We'll use a single dummy assignment ID to get column metadata
        const res = await fetch("/api/assignments/columns/eligibility?page=assignments");


        if (!res.ok) {
            console.warn("Could not fetch column eligibility");
            return;
        }

        const data = await res.json();
        const riskColumn = data.columns?.find(c => c.key === "risk_score");
        
        const riskFilterMode = document.getElementById("riskFilterMode");
        const riskThreshold = document.getElementById("riskThreshold");
        
        if (!riskFilterMode || !riskThreshold) return;
        
        // Find the parent selector-bar for adding the hint
        const selectorBar = riskFilterMode.closest(".selector-bar");
        if (!selectorBar) return;
        
        // Remove any existing risk filter hint
        const existingHint = selectorBar.querySelector(".risk-filter-hint");
        if (existingHint) {
            existingHint.remove();
        }
        
        if (riskColumn && riskColumn.locked && riskColumn.lock_reason) {
            // Risk score is locked - disable risk filter
            riskFilterMode.disabled = true;
            riskThreshold.disabled = true;
            
            // Add hint explaining why it's disabled
            const hintDiv = document.createElement("div");
            hintDiv.className = "risk-filter-hint";
            hintDiv.style.gridColumn = "1 / -1";
            hintDiv.style.padding = "12px";
            hintDiv.style.background = "rgba(255, 152, 0, 0.1)";
            hintDiv.style.borderRadius = "8px";
            hintDiv.style.fontSize = "0.9rem";
            hintDiv.style.border = "1px solid rgba(255, 152, 0, 0.3)";
            
            const hintTitle = document.createElement("strong");
            hintTitle.textContent = "🔒 Risk filter disabled";
            hintTitle.style.display = "block";
            hintTitle.style.marginBottom = "6px";
            
            const hintText = document.createElement("div");
            hintText.textContent = "Risk filtering requires the same data as the Risk Score column:";
            hintText.style.marginBottom = "8px";
            
            const reqText = document.createElement("div");
            reqText.style.fontFamily = "monospace";
            reqText.style.fontSize = "0.85rem";
            reqText.style.whiteSpace = "pre-line";
            reqText.style.marginLeft = "8px";
            reqText.textContent = buildRequirementExplanation(riskColumn.lock_reason);
            
            const unlockHint = document.createElement("div");
            unlockHint.style.marginTop = "8px";
            unlockHint.style.fontStyle = "italic";
            unlockHint.textContent = riskColumn.lock_reason.unlock_hint || "";
            
            hintDiv.appendChild(hintTitle);
            hintDiv.appendChild(hintText);
            hintDiv.appendChild(reqText);
            if (riskColumn.lock_reason.unlock_hint) {
                hintDiv.appendChild(unlockHint);
            }
            
            // Insert hint before the actions
            const actions = selectorBar.querySelector(".selector-actions");
            if (actions) {
                selectorBar.insertBefore(hintDiv, actions);
            } else {
                selectorBar.appendChild(hintDiv);
            }
        } else {
            // Risk score is unlocked - enable risk filter
            riskFilterMode.disabled = false;
            riskThreshold.disabled = false;
        }
    } catch (error) {
        console.error("Failed to check risk filter eligibility:", error);
    }
}

export function initColumnVisibility() {
    loadColumnPreferences();
    console.log("[Column Visibility] Initialized");
   
    // Add hints to all column checkboxes
    addColumnHints();
    
    // Check risk filter eligibility
    checkRiskFilterEligibility();
   
    const applyBtn = document.getElementById("applyColumnVisibility");
   
    if (applyBtn) {
        applyBtn.addEventListener("click", handleApplyColumnVisibility);
    }
}

/**
 * Add hint icons to column visibility checkboxes
 */
function addColumnHints() {
    document.querySelectorAll("input[name='column_visibility']").forEach(checkbox => {
        const columnKey = checkbox.dataset.columnKey;
        const label = checkbox.closest("label");
        
        if (!label || !columnKey) return;
        
        // Check if hint already exists
        if (label.querySelector(".hint-icon")) return;
        
        // Create hint icon
        const hintIcon = document.createElement("span");
        hintIcon.className = "hint-icon";
        hintIcon.textContent = "?";
        hintIcon.dataset.hint = getColumnDescription(columnKey);
        
        label.appendChild(hintIcon);
    });
}

async function loadColumnPreferences() {
    try {
        const res = await fetch("/api/preferences/columns");
        if (!res.ok) return;

        const prefs = await res.json();

        // Set checkbox states based on preferences
        document.querySelectorAll("input[name='column_visibility']").forEach(cb => {
            const columnKey = cb.dataset.columnKey;
            if (prefs.hasOwnProperty(columnKey)) {
                cb.checked = prefs[columnKey];
            }
        });
    } catch (error) {
        console.error("Failed to load column preferences:", error);
    }
}

async function handleApplyColumnVisibility() {
    const preferences = {};

    document.querySelectorAll("input[name='column_visibility']").forEach(cb => {
        const columnKey = cb.dataset.columnKey;
        preferences[columnKey] = cb.checked;
    });

    try {
        const csrfToken = document.querySelector("meta[name='csrf-token']").content;
       
        const res = await fetch("/api/preferences/columns", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify(preferences)
        });

        if (!res.ok) {
            throw new Error("Failed to save column preferences");
        }

        // Refresh the table to apply new column visibility
        await emitRefresh("assignments:table");
    } catch (error) {
        console.error("Error saving column preferences:", error);
        alert("Failed to save column preferences");
    }
}