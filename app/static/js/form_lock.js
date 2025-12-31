document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    const hasActiveSession = form.dataset.hasActiveSession === "true";

    const startNowRadio = document.querySelector('input[name="start_option"][value="now"]');
    const startLaterRadio = document.querySelector('input[name="start_option"][value="later"]');
    const startedAtGroup = document.getElementById("started-at-group");
    const startedAtInput = document.getElementById("started-at");
    const submitBtn = document.getElementById("session-submit-btn");

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
    updateForm(); // initial state

    // ================= FORM LOCK =================
    if (hasActiveSession) {
        lockForm(
            form,
            "There is an ongoing study session.<br>Only one session is allowed at a time."
        );
    }
});


/**
 * Locks a form completely
 * @param {HTMLFormElement} form
 * @param {string} message
 */
function lockForm(form, message) {
    form.classList.add("disabled");

    form.querySelectorAll("input, select, textarea, button").forEach(el => {
        el.disabled = true;
    });

    const overlay = form.querySelector(".form-overlay");
    if (overlay) {
        overlay.classList.remove("hidden");
        if (message) {
            const p = overlay.querySelector("p");
            if (p) p.innerHTML = message;
        }
    }

    form.addEventListener("submit", e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });


}

 