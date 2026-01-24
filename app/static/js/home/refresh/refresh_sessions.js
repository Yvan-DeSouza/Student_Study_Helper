export async function refreshHomeSessions() {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    // Reset inputs
    form.reset();

    // Re-populate class dropdown
    try {
        const response = await fetch('/classes/json');
        if (response.ok) {
            const classes = await response.json();
            const classSelect = document.getElementById("study-class");
            if (classSelect) {
                classSelect.innerHTML = '';
                classes.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.class_id;
                    option.textContent = c.class_name;
                    classSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error("Error refreshing session form:", error);
    }

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
