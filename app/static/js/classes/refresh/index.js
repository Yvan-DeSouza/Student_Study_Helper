import { runRefreshes } from "../../core/refreshBus.js";

export async function submitClassForm(form, { refresh = [] } = {}) {
    const method =
        form.querySelector('input[name="_method"]')?.value ||
        form.method ||
        "POST";

    const response = await fetch(form.action, {
        method,
        body: new FormData(form),
        headers: { Accept: "application/json" }
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw err;
    }

    const result = await response.json();

    // Close modal
    document.querySelector("[data-close-modal]")?.click();

    // 🔑 Run refresh hooks
    await runRefreshes(refresh);

    // Emit event for page refreshes
    document.dispatchEvent(new CustomEvent("class:changed"));

    return result;
}
