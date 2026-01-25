import { emitRefresh } from './refreshBus.js';

export async function submitFormAjax(form, refreshKeys = []) {
    const url = form.action;
    const formData = new FormData(form);

    const response = await fetch(url, {
        method: form.method || "POST",
        body: formData,
        headers: {
            "Accept": "application/json"
        }
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
        throw data;
    }

    await emitRefresh(...refreshKeys);
    return data;
}
