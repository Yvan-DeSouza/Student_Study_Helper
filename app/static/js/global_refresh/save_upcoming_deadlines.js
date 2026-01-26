export function saveUpcomingDeadlinesIfDirty(pageId) {
    const input = document.getElementById(`deadlines-count-input-${pageId}`);
    if (!input) return;

    const count = parseInt(input.value, 10);
    if (isNaN(count) || count < 0 || count > 10) return;

    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content");

    if (!csrfToken) {
        console.warn("Missing CSRF token — not saving deadlines count");
        return;
    }

    fetch("/api/user-preferences/deadlines-count", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({ count }),
        keepalive: true 
    }).catch(err => {
        // unload-safe: just log, don't block navigation
        console.warn("Failed to save deadlines count:", err);
    });
}
