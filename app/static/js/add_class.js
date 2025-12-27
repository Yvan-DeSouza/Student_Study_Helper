document.addEventListener("DOMContentLoaded", () => {
    const addModal = document.getElementById("addClassModal");
    if (!addModal) return;

    const form = addModal.querySelector("form");
    if (!form) return;

    const errorModal = document.getElementById("class-code-error-modal");
    const errorText = document.getElementById("class-code-error-text");
    const closeErrorBtn = document.getElementById("close-class-code-error");

    function isEditMode() {
        return form.action.includes("/edit");
    }

    form.addEventListener("submit", async (e) => {
        if (isEditMode()) return; // allow normal edit POST

        e.preventDefault();

        const formData = new FormData(form);

        const res = await fetch(form.action, {
            method: "POST",
            body: formData,
            headers: {
                "Accept": "application/json"
            }
        });

        // Safety: backend should always return JSON
        let data;
        try {
            data = await res.json();
        } catch {
            console.error("Non-JSON response from server");
            return;
        }

        if (!data.success && data.error === "DUPLICATE_CLASS_CODE") {
            errorText.textContent =
                `Your class code is already used for your "${data.existing_class_name}" class. Please choose a different one.`;

            // Close add modal
            addModal.classList.remove("active");
            addModal.classList.add("hidden");

            // Open error modal
            errorModal.classList.remove("hidden");
            errorModal.classList.add("active");
            return;
        }

        // Success
        window.location.reload();
    });

    closeErrorBtn?.addEventListener("click", () => {
        errorModal.classList.remove("active");
        errorModal.classList.add("hidden");

        addModal.classList.remove("hidden");
        addModal.classList.add("active");
    });
});
