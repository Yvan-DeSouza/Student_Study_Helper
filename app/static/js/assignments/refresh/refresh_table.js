export async function refreshAssignmentsTable() {
    const sortRadios = document.querySelectorAll('input[name="sortCategory"]');
    const currentSort = Array.from(sortRadios).find(r => r.checked)?.value || '';

    try {
        const response = await fetch('/assignments?partial=table');
        const html = await response.text();

        const wrapper = document.querySelector('.assignments-table-card');
        if (wrapper) {
            wrapper.innerHTML = html;
        }

        // Reapply sort
        if (currentSort) {
            const newRadio = document.querySelector(`input[name="sortCategory"][value="${currentSort}"]`);
            if (newRadio) {
                newRadio.checked = true;
                newRadio.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    } catch (error) {
        console.error("Error refreshing assignments table:", error);
    }
}
