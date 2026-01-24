export async function refreshHomeSessions() {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    console.log("[Sessions] Refreshing study session form");

    // Reset inputs
    form.reset();

    // Re-populate class dropdown
    try {
        const response = await fetch('/classes/json');
        if (response.ok) {
            const classes = await response.json();
            const classSelect = document.getElementById("study-class");
            const assignmentSelect = document.getElementById("study-assignment");
            
            if (classSelect) {
                classSelect.innerHTML = '';
                classes.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.class_id;
                    option.textContent = c.class_name;
                    classSelect.appendChild(option);
                });
            }

            // Also refresh assignment dropdown with proper data-class attributes
            if (assignmentSelect) {
                const assignmentsResponse = await fetch('/assignment/json');
                if (assignmentsResponse.ok) {
                    const assignments = await assignmentsResponse.json();
                    assignmentSelect.innerHTML = '<option value="">None</option>';
                    assignments.forEach(a => {
                        const option = document.createElement('option');
                        option.value = a.assignment_id;
                        option.textContent = a.title;
                        option.setAttribute('data-class', a.class_id);
                        assignmentSelect.appendChild(option);
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error refreshing session form:", error);
    }

    // Re-check if there's an active session and update lock state
    await checkAndUpdateSessionLock();
}

async function checkAndUpdateSessionLock() {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    try {
        const response = await fetch('/study/active-session-status');
        if (response.ok) {
            const data = await response.json();
            const hasActive = data.has_active_session;
            
            form.dataset.hasActiveSession = hasActive ? "true" : "false";
            
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
    } catch (error) {
        console.error("Error checking session status:", error);
    }
}