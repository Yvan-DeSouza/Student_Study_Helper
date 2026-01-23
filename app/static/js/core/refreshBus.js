const listeners = {};

export function registerRefresh(key, fn) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
}

export async function runRefreshes(keys = []) {
    for (const key of keys) {
        const fns = listeners[key] || [];
        for (const fn of fns) {
            await fn();
        }
    }
}
