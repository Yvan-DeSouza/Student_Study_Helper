export async function refreshAssignmentsTable() {
    const sortRadios = document.querySelectorAll('input[name="sortCategory"]');
    const currentSort = Array.from(sortRadios).find(r => r.checked)?.value || '';

    const response = await fetch('/assignments/table');
    const html = await response.text();

    const table = document.querySelector('.assignments-table');
    if (table) {
        table.innerHTML = html;
    }

    // Reapply
    const newRadio = document.querySelector(`input[name="sortCategory"][value="${currentSort}"]`);
    if (newRadio) {
        newRadio.checked = true;
        newRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
}
