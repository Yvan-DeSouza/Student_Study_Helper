const listeners = {};

export function registerRefresh(key, fn) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
}

export function unregisterRefresh(key) {
    if (listeners[key]) {
        delete listeners[key];
    }
}

export async function runRefreshes(keys = []) {
    console.log("[RefreshBus] Running refreshes for:", keys);
    for (const key of keys) {
        const fns = listeners[key] || [];
        console.log(`[RefreshBus] ${key}: ${fns.length} listeners`);
        for (const fn of fns) {
            try {
                await fn();
            } catch (error) {
                console.error(`[RefreshBus] Error in ${key}:`, error);
            }
        }
    }
}

export function emitRefresh(...keys) {
    return runRefreshes(keys);
}