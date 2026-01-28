export async function refreshAssignmentCharts() {
    console.log("[Assignments] Refreshing charts");
    
    // Trigger chart refresh via existing chart system
    if (typeof window.refreshAssignmentCharts === 'function') {
        window.refreshAssignmentCharts();
    }
    
    // Also dispatch event for any other listeners
    document.dispatchEvent(new CustomEvent("charts:refresh"));
}