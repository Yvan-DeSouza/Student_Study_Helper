document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("addClassModal");

    const openButtons = [
        document.getElementById("openAddClassModal"),
        document.getElementById("openAddClassModalEmpty")
    ].filter(Boolean);

    openButtons.forEach(btn =>
        btn.addEventListener("click", () => {
            modal.classList.add("active");
        })
    );

    document
        .getElementById("cancelAddClass")
        .addEventListener("click", () => {
            modal.classList.remove("active");
        });
});
