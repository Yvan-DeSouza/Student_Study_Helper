document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll("[data-toggle-checkbox]").forEach(checkbox => {
        const targetId = checkbox.dataset.toggleCheckbox;
        const target = document.getElementById(targetId);

        if (!target) return;

        const input = target.querySelector("input");

        const update = () => {
            if (checkbox.checked) {
                target.classList.remove("hidden");
                if (input) input.required = true;
            } else {
                target.classList.add("hidden");
                if (input) {
                    input.required = false;
                    input.value = "";
                }
            }
        };

        update();
        checkbox.addEventListener("change", update);
    });
});
