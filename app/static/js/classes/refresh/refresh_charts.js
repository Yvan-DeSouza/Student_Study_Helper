export async function refreshCharts() {
    document.dispatchEvent(new CustomEvent("charts:refresh"));
}
