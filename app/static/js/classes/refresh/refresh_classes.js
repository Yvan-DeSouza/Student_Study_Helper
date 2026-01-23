import { registerRefresh } from "../../core/refreshBus.js";

async function refreshClasses() {
    const grid = document.querySelector(".classes-grid");
    if (!grid) return;

    const res = await fetch("/classes?partial=cards");
    const html = await res.text();

    grid.innerHTML = html;

    // Emit event to trigger selector re-application
    document.dispatchEvent(new CustomEvent("classes:updated"));
}

// Register once
registerRefresh("classes", refreshClasses);
