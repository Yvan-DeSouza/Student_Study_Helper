document.addEventListener('DOMContentLoaded', () => {
    // 1. Find ALL buttons with the class 'theme-toggle'
    const themeButtons = document.querySelectorAll('.theme-toggle');
    const icon = document.querySelector('.toggle-icon');

    // 2. Function to apply the theme
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update the icon based on theme
        if (icon) {
            icon.textContent = theme === 'dark' ? '🌙' : '☀️';
        }
    };

    // 3. Set initial theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    // 4. Add click listener to every toggle button found on the page
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    });
});