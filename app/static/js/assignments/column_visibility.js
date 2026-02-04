
import { emitRefresh } from '../core/refreshBus.js';

export function initColumnVisibility() {
    loadColumnPreferences();
    
    const applyBtn = document.getElementById("applyColumnVisibility");
    if (applyBtn) {
        applyBtn.addEventListener("click", handleApplyColumnVisibility);
    }
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