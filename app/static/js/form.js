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


    const startNowRadio = document.querySelector('input[name="start_option"][value="now"]');
    const startLaterRadio = document.querySelector('input[name="start_option"][value="later"]');
    const startedAtGroup = document.getElementById("started-at-group");
    const startedAtInput = document.getElementById("started-at");
    const submitBtn = document.getElementById("session-submit-btn");
    const sessionForm = document.getElementById("study-session-form");


    function updateForm() {
        if (startLaterRadio.checked) {
            startedAtGroup.style.display = "block";
            startedAtInput.required = true;
            submitBtn.textContent = "Log Session";
        } else {
            startedAtGroup.style.display = "none";
            startedAtInput.required = false;
            startedAtInput.value = "";
            submitBtn.textContent = "Start Session";
        }
    }

    startNowRadio.addEventListener("change", updateForm);
    startLaterRadio.addEventListener("change", updateForm);
    updateForm(); // initial call

    // Disable form if active session exists
    // ================= FORM LOCK =================
    if (sessionForm && sessionForm.dataset.active === "true") {
        lockForm(
            sessionForm,
            "There is an ongoing study session.<br>Only one session is allowed at a time."
        );
    }



 
});
