export async function refreshClassCards() {
    // Capture state
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const sortSelect = document.getElementById('sortSelect');
    const currentStatus = statusFilter ? statusFilter.value : '';
    const currentType = typeFilter ? typeFilter.value : '';
    const currentSort = sortSelect ? sortSelect.value : '';

    try {
        // Fetch fresh cards HTML
        const response = await fetch('/classes?partial=cards');
        const html = await response.text();

        // Replace
        const container = document.querySelector('.classes-grid');
        if (container) {
            container.innerHTML = html;
        }

        // Reapply state
        if (statusFilter && currentStatus) {
            statusFilter.value = currentStatus;
            statusFilter.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (typeFilter && currentType) {
            typeFilter.value = currentType;
            typeFilter.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (sortSelect && currentSort) {
            sortSelect.value = currentSort;
            sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    } catch (error) {
        console.error("Error refreshing class cards:", error);
    }
}