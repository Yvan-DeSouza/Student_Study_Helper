document.addEventListener("DOMContentLoaded", () => {

    // ================= GRADED CONDITIONAL FIELDS =================
    document.querySelectorAll("[data-toggle-checkbox]").forEach(checkbox => {
        const target = document.getElementById(checkbox.dataset.toggleCheckbox);
        if (!target) return;

        const inputs = target.querySelectorAll("input");

        const update = () => {
            const active = checkbox.checked;
            target.classList.toggle("hidden", !active);

            inputs.forEach(input => {
                input.required = active;
                if (!active) input.value = "";
            });
        };

        update();
        checkbox.addEventListener("change", update);
    });

    // ================= ADVANCED OPTIONS =================
    document.querySelectorAll(".advanced-toggle").forEach(toggle => {
        const advanced = toggle.nextElementSibling;
        if (!advanced) return;

        toggle.addEventListener("click", () => {
            const open = !advanced.classList.contains("hidden");
            advanced.classList.toggle("hidden");
            toggle.textContent = open
                ? "▸ Advanced options"
                : "▾ Advanced options";
            toggle.setAttribute("aria-expanded", String(!open));
        });
    });
});
