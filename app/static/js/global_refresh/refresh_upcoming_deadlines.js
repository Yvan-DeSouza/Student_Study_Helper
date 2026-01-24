export async function refreshUpcomingDeadlines() {
    const response = await fetch('/upcoming-deadlines/partial');
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newContent = doc.getElementById('deadlines-content-main');
    const container = document.getElementById('deadlines-content-main');

    if (newContent && container) {
        container.innerHTML = newContent.innerHTML;
    }
}
