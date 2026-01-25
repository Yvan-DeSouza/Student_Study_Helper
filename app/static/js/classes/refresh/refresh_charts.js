// static/js/classes/refresh/refresh_charts.js
export async function refreshClassCharts() {
    console.log("[Classes] Refreshing charts");
    document.dispatchEvent(new CustomEvent("charts:refresh"));
}