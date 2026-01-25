import { submitFormAjax } from '../core/ajaxForm.js';

export function initStudySessionSubmit() {
    const form = document.getElementById("study-session-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        try {
            await submitFormAjax(form, [
                "home:sessions",
                "home:charts",
                "upcoming-deadlines"
            ]);
        } catch (err) {
            console.error("[Session submit error]", err);
            alert("Unable to start session.");
        }
    });
}
