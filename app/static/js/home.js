document.addEventListener('DOMContentLoaded', () => {
    
    // Theme logic is already handled by theme.js in base.html
    const homeThemeBtn = document.getElementById('home-theme-btn');
    if(homeThemeBtn){
        homeThemeBtn.addEventListener('click', () => {
            // This button triggers the same logic as the global one
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            homeThemeBtn.querySelector('span').textContent = newTheme === 'dark' ? '🌙' : '☀️';
        });
    }

    // --- CHART.JS PLACEHOLDERS (To match the look) ---

    // 1. Time per Class (Donut)
    const ctx1 = document.getElementById('timeClassChart');
    if(ctx1) {
        new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['History', 'Physics', 'Math'],
                datasets: [{
                    data: [30, 20, 50],
                    backgroundColor: ['#f2714b', '#4b8df2', '#f4d35e'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                cutout: '65%',
                plugins: { legend: { display: false } },
                maintainAspectRatio: false
            }
        });
    }

    // 2. Weekly Hours (Tiny Bar)
    const ctx2 = document.getElementById('tinyBarChart');
    if(ctx2) {
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['M','T','W','T','F'],
                datasets: [{
                    data: [2, 4, 3, 5, 2],
                    backgroundColor: '#ff9966',
                    borderRadius: 3
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } },
                maintainAspectRatio: false
            }
        });
    }

    // 3. Trend (Area)
    const ctx3 = document.getElementById('trendChart');
    if(ctx3) {
        new Chart(ctx3, {
            type: 'line',
            data: {
                labels: ['1','2','3','4','5'],
                datasets: [{
                    data: [10, 15, 12, 18, 20],
                    borderColor: '#4b8df2',
                    backgroundColor: 'rgba(75, 141, 242, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } },
                maintainAspectRatio: false
            }
        });
    }
});