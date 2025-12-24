document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.getElementById("openAddAssignmentModal");
    const modal = document.getElementById("addAssignmentModal");
    const closeBtn = modal.querySelector(".ghost-btn");

    if (openBtn && modal && closeBtn) {
        // Open modal
        openBtn.addEventListener("click", () => modal.classList.add("visible"));

        // Close modal
        closeBtn.addEventListener("click", () => modal.classList.remove("visible"));

        // Close when clicking outside modal content
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.classList.remove("visible");
        });
    }

    // Graded checkbox inside modal
    const gradedCheckbox = modal.querySelector("#is-graded");
    const ponderationBox = modal.querySelector("#ponderation-container");
    const ponderationInput = modal.querySelector("#ponderation");

    if (gradedCheckbox && ponderationBox && ponderationInput) {
        const updatePonderation = () => {
            if (gradedCheckbox.checked) {
                ponderationBox.classList.remove("hidden");
                ponderationInput.required = true;
            } else {
                ponderationBox.classList.add("hidden");
                ponderationInput.required = false;
                ponderationInput.value = "";
            }
        };

        updatePonderation();
        gradedCheckbox.addEventListener("change", updatePonderation);
    }

});
