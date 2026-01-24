export async function refreshHomeAssignments() {
    const form = document.querySelector("form[action='/assignment']");
    if (form) form.reset();
}
