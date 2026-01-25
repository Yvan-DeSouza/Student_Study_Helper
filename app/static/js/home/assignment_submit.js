import { submitFormAjax } from '../core/ajaxForm.js';

export function initAssignmentSubmit() {
    const form = document.querySelector("form[action*='/assignment']");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            await submitFormAjax(form, [
                "home:assignments",
                "home:charts",
                "upcoming-deadlines",
                "home:sessions" // assignments affect session dropdown
            ]);
        } catch (err) {
            console.error("[Assignment submit error]", err);
            alert("Unable to add assignment.");
        }
    });
}
