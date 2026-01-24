export async function refreshHomeAssignments() {
    const form = document.querySelector("form[action='/assignment']");
    if (form) form.reset();
    
    try {
        const response = await fetch('/classes/json');
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
