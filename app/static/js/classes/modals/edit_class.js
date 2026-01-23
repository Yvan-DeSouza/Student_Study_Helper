// static/js/classes/modals/edit_class.js
import { showModal } from "../../core/modalManager.js";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("editClassForm");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const formData = new FormData(form);

        const res = await fetch(form.action, {
            method: "PATCH",
            body: formData,
            headers: { 
                "Accept": "application/json",
                "X-CSRFToken": document.querySelector("meta[name='csrf-token']").content 
            }
        });

        const data = await res.json();

        if (!data.success && data.error === "DUPLICATE_CLASS_CODE") {
            alert(`Class code already used by "${data.existing_class_name}"`);
            return;
        }

        window.location.reload();
    });
});
