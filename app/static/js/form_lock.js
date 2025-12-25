/**
 * Locks a form completely (no clicks, no submit, no focus)
 * @param {HTMLFormElement} form
 * @param {string} message
 */
function lockForm(form, message) {
    if (!form) return;

    form.classList.add("disabled");

    // Disable all inputs
    form.querySelectorAll("input, select, textarea, button").forEach(el => {
        el.disabled = true;
    });

    // Overlay
    const overlay = form.querySelector(".form-overlay");
    if (overlay) {
        overlay.classList.remove("hidden");
        if (message) {
            const p = overlay.querySelector("p");
            if (p) p.innerHTML = message;
        }
    }

    // Absolute submit protection (even if browser ignores disabled)
    form.addEventListener("submit", e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
}
