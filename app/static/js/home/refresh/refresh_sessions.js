export async function refreshHomeSessions() {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    console.log("[Sessions] Refreshing study session form");

    // Save current state of start_option radio buttons before reset
    const wasStartLater = document.querySelector('input[name="start_option"][value="later"]')?.checked;

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
                const currentClassId = classSelect.value;
                classSelect.innerHTML = '';
                classes.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.class_id;
                    option.textContent = c.class_name;
                    classSelect.appendChild(option);
                });
                
                // Try to restore previous selection if it still exists
                if (currentClassId && classes.find(c => c.class_id == currentClassId)) {
                    classSelect.value = currentClassId;
                }
            }

            // Refresh assignment dropdown with proper data-class attributes
            if (assignmentSelect) {
                // Fetch all assignments
                const allAssignments = await fetchAllAssignments();
                
                assignmentSelect.innerHTML = '<option value="">None</option>';
                allAssignments.forEach(a => {
                    const option = document.createElement('option');
                    option.value = a.assignment_id;
                    option.textContent = a.title;
                    option.setAttribute('data-class', a.class_id);
                    assignmentSelect.appendChild(option);
                });
                
                // Re-trigger the filter based on selected class
                filterAssignmentsByClass();
            }
        }
    } catch (error) {
        console.error("Error refreshing session form:", error);
    }

    // Re-check if there's an active session and update lock state
    await updateSessionLockState();
    
    // Restore radio button state
    if (wasStartLater) {
        const laterRadio = document.querySelector('input[name="start_option"][value="later"]');
        if (laterRadio) {
            laterRadio.checked = true;
            laterRadio.dispatchEvent(new Event('change'));
        }
    }
}

async function fetchAllAssignments() {
    try {
        const response = await fetch('/assignments/json');
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error("Error fetching assignments:", error);
    }
    return [];
}

function filterAssignmentsByClass() {
    const classSelect = document.getElementById("study-class");
    const assignmentSelect = document.getElementById("study-assignment");
    
    if (!classSelect || !assignmentSelect) return;
    
    const selectedClass = String(classSelect.value).trim();
    const allOptions = Array.from(assignmentSelect.querySelectorAll('option'));
    
    // Hide/show options based on class
    allOptions.forEach(opt => {
        if (opt.value === '') {
            opt.style.display = ''; // Always show "None"
            return;
        }
        
        const optClass = opt.getAttribute('data-class');
        opt.style.display = (optClass === selectedClass) ? '' : 'none';
    });
}

async function updateSessionLockState() {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    try {
        const response = await fetch('/study/active');
        if (response.ok) {
            const data = await response.json();
            const hasActive = data.active;
            
            form.dataset.hasActiveSession = hasActive ? "true" : "false";
            
            const overlay = form.querySelector(".form-overlay");
            const submitBtn = form.querySelector("#session-submit-btn");
            const formBody = form.querySelector(".form-body");

            if (hasActive) {
                overlay?.classList.remove("hidden");
                submitBtn?.setAttribute("disabled", "disabled");
                formBody?.classList.add("locked");
                
                // Disable all form inputs
                form.querySelectorAll("input, select, textarea, button").forEach(el => {
                    el.disabled = true;
                });
            } else {
                overlay?.classList.add("hidden");
                submitBtn?.removeAttribute("disabled");
                formBody?.classList.remove("locked");
                
                // Enable all form inputs
                form.querySelectorAll("input, select, textarea, button").forEach(el => {
                    el.disabled = false;
                });
            }
        }
    } catch (error) {
        console.error("Error checking session status:", error);
    }
}