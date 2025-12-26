document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    const hasActiveSession = form.dataset.hasActiveSession === "true";

    if (!hasActiveSession) return;

    lockForm(form, "You have an active study session");
});

/**
 * Locks a form completely
 * @param {HTMLFormElement} form
 * @param {string} message
 */
function lockForm(form, message) {
    form.classList.add("disabled");

    form.querySelectorAll("input, select, textarea, button").forEach(el => {
        el.disabled = true;
    });

    const overlay = form.querySelector(".form-overlay");
    if (overlay) {
        overlay.classList.remove("hidden");
        if (message) {
            const p = overlay.querySelector("p");
            if (p) p.innerHTML = message;
        }
    }

    form.addEventListener("submit", e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
}
