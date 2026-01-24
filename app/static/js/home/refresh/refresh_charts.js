export async function refreshHomeCharts() {
    document.dispatchEvent(new CustomEvent("home:charts:refresh"));
}
