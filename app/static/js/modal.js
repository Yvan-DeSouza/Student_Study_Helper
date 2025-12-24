document.addEventListener("DOMContentLoaded", () => {
    // ------------------------------
    // Open modal
    // ------------------------------
    document.querySelectorAll("[data-open-modal]").forEach(btn => {
        btn.addEventListener("click", () => {
            const modalId = btn.getAttribute("data-open-modal");
            const modal = document.getElementById(modalId);
            if (!modal) return;

            // Use custom class if provided, otherwise fallback
            const openClass = modal.dataset.modalClass || "visible";
            modal.classList.add(openClass);
        });
    });

    // ------------------------------
    // Close modal buttons
    // ------------------------------
    document.querySelectorAll("[data-close-modal]").forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = btn.closest(".modal-overlay");
            if (!modal) return;

            const openClass = modal.dataset.modalClass || "visible";
            modal.classList.remove(openClass);
        });
    });

    // ------------------------------
    // Click outside modal to close
    // ------------------------------
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", e => {
            if (e.target === overlay) {
                const openClass = overlay.dataset.modalClass || "visible";
                overlay.classList.remove(openClass);
            }
        });
    });
});
