document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.getElementById("openAddAssignmentModal");
    const modal = document.getElementById("addAssignmentModal");
    const closeBtn = modal.querySelector(".ghost-btn");

    // Open modal
    openBtn.addEventListener("click", () => {
        modal.classList.add("visible");
    });

    // Close modal
    closeBtn.addEventListener("click", () => {
        modal.classList.remove("visible");
    });

    // Optional: close modal when clicking outside
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("visible");
        }
    });
});
