// static/js/classes/modals/add_class.js
import { showModal, closeModal } from "../../core/modalManager.js";

document.addEventListener("DOMContentLoaded", () => {
    const addModal = document.getElementById("addClassModal");
    if (!addModal) return;

    const form = addModal.querySelector("form");
    if (!form) return;

    const errorModal = document.getElementById("class-code-error-modal");
    const errorText = document.getElementById("class-code-error-text");
    const closeErrorBtn = document.getElementById("close-class-code-error");

    function resetAddClassModal() {
        form.reset();
        document.getElementById("classColor").value = "#4f46e5";
    }

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const formData = new FormData(form);

        const res = await fetch(form.action, {
            method: "POST",
            body: formData,
            headers: { 
                "Accept": "application/json",
                "X-CSRFToken": document.querySelector("meta[name='csrf-token']").content 
            }
        });

        const data = await res.json();

        if (!data.success && data.error === "DUPLICATE_CLASS_CODE") {
            errorText.textContent = `Your class code is already used for "${data.existing_class_name}". Please choose another.`;
            closeModal("addClassModal");
            showModal("class-code-error-modal");
            return;
        }

        window.location.reload();
    });

    closeErrorBtn?.addEventListener("click", () => {
        closeModal("class-code-error-modal");
        showModal("addClassModal");
    });

    // Open add modal buttons
    document.querySelectorAll("[data-open-modal='addClassModal']").forEach(btn => {
        btn.addEventListener("click", () => {
            resetAddClassModal();
            showModal("addClassModal");
        });
    });
});
