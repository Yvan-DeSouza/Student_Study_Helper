export async function refreshCharts() {
    document.dispatchEvent(new CustomEvent("data-updated"));
}
