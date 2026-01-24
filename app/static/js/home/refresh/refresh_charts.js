export async function refreshHomeCharts() {
    console.log("[Charts] Triggering chart refresh");
    document.dispatchEvent(new CustomEvent("home:charts:refresh"));
}