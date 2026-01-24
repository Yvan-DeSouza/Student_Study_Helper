// static/js/home/refresh/refresh_charts.js
export async function refreshHomeCharts() {
    // Trigger chart refresh event
    document.dispatchEvent(new CustomEvent("home:charts:refresh"));
}

// static/js/home/refresh/refresh_assignments.js
export async function refreshHomeAssignments() {
    const form = document.querySelector("form[action*='/assignment']");
    if (!form) return;

    // Reset the assignment form
    form.reset();

    // Re-populate class dropdown if needed
    try {
        const response = await fetch('/classes?partial=json');
        if (response.ok) {
            const classes = await response.json();
            const classSelect = document.getElementById("assignment-class");
            
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
        console.error("Error refreshing assignment form:", error);
    }
}

// static/js/home/refresh/refresh_sessions.js
export async function refreshHomeSessions() {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    // Reset inputs
    form.reset();

    // Re-populate class dropdown
    try {
        const response = await fetch('/classes?partial=json');
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