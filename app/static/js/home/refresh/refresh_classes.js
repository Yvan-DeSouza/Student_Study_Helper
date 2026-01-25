import { emitRefresh } from '../../core/refreshBus.js';

/**
 * A class was added/edited/deleted.
 * On Home, this affects:
 * - assignment form
 * - study session form
 * - home charts
 */
export async function refreshHomeClasses() {
    console.log("[Home] Classes changed → refreshing dependent UI");

    await emitRefresh(
        "home:assignments",
        "home:sessions",
        "home:charts"
    );
}
