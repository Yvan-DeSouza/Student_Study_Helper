export function refreshHomeSessions() {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    // Reset inputs
    form.reset();

    // Re-evaluate active session lock
    const hasActive = form.dataset.hasActiveSession === "true";

    const overlay = form.querySelector(".form-overlay");
    const submitBtn = form.querySelector("#session-submit-btn");
    const formBody = form.querySelector(".form-body");

    if (hasActive) {
        overlay?.classList.remove("hidden");
        submitBtn?.setAttribute("disabled", "disabled");
        formBody?.classList.add("locked");
    } else {
        overlay?.classList.add("hidden");
        submitBtn?.removeAttribute("disabled");
        formBody?.classList.remove("locked");
    }
}
