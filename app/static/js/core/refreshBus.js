// static/js/core/refreshBus.js

const listeners = {};

export function registerRefresh(key, fn) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
}

export function unregisterRefresh(key) {
    delete listeners[key];
}

export async function runRefreshes(events = []) {
    for (const event of events) {
        const key = typeof event === "string" ? event : event.key;
        const payload = typeof event === "string" ? undefined : event.payload;

        const fns = listeners[key] || [];
        for (const fn of fns) {
            await fn(payload);
        }
    }
}

export function emitRefresh(...events) {
    return runRefreshes(events);
}
