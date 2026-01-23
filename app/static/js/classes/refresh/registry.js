import { refreshClasses } from "./refresh_classes.js";
import { refreshCharts } from "./refresh_charts.js";

const refreshMap = {
    classes: refreshClasses,
    charts: refreshCharts
};

export async function runRefreshes(keys = []) {
    for (const key of keys) {
        if (refreshMap[key]) {
            await refreshMap[key]();
        }
    }
}
