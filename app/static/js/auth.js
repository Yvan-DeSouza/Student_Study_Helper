const toggle = document.querySelector('.theme-toggle');
const icon = document.querySelector('.toggle-icon');

toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        icon.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        icon.textContent = '☀️';
    }
});
