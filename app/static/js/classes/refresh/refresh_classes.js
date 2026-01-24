// static/js/classes/refresh/refresh_classes.js
import { registerRefresh } from "../../core/refreshBus.js";

async function refreshClasses() {
    const grid = document.querySelector(".classes-grid");
    if (!grid) return;

    try {
        const res = await fetch("/classes?partial=cards");
        if (!res.ok) throw new Error("Failed to fetch classes");
        
        const html = await res.text();
        grid.innerHTML = html;

        // Emit event to trigger selector re-application and button reattachment
        document.dispatchEvent(new CustomEvent("classes:updated"));
    } catch (error) {
        console.error("Error refreshing classes:", error);
    }
}

// Register once
registerRefresh("classes", refreshClasses);

export { refreshClasses };