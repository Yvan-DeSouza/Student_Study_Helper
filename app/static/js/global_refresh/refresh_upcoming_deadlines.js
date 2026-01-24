export async function refreshUpcomingDeadlines() {
    const countSelect = document.getElementById('deadline-count-main');
    const currentCount = countSelect ? countSelect.value : '3';

    const response = await fetch('/upcoming-deadlines/partial');
    const html = await response.text();

    const container = document.getElementById('deadlines-content-main');
    if (container) {
        container.innerHTML = html;
    }

    // Reapply
    const newSelect = document.getElementById('deadline-count-main');
    if (newSelect) {
        newSelect.value = currentCount;
        newSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
}
