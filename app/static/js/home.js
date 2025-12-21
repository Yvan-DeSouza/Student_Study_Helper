document.addEventListener('DOMContentLoaded', () => {

    // --- 1. IMAGE SWAPPER LOGIC ---
    // Note: This relies on theme.js handling the actual localstorage/attribute change.
    // We just listen for the click to swap images.
    
    const themeBtn = document.getElementById('home-theme-btn');
    
    // Define your images here. 
    // Key = ID in HTML, Value = base filename (without extension)
    const toggleImages = {
        'theme-img-logo': 'study_logo',
        'theme-img-laptop': 'computer',
        'theme-img-books': 'stack_books'
    };

    function updateImages() {
        // Wait 50ms for the attribute to update in DOM
        setTimeout(() => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const suffix = currentTheme === 'dark' ? '_dark' : '';
            
            for (const [id, baseName] of Object.entries(toggleImages)) {
                const img = document.getElementById(id);
                if(img) {
                    // This assumes you have images named "computer_dark.png", etc.
                    // If the dark image doesn't exist, it might break, so ensure files exist.
                    // Assuming path is static/images/
                    img.src = `/static/images/${baseName}${suffix}.png`;
                }
            }
        }, 50);
    }

    if(themeBtn) {
        themeBtn.addEventListener('click', updateImages);
        // Run once on load to ensure correct images
        updateImages();
    }


    // --- 2. CHART.JS CONFIGURATION ---

    // Time per Class (Donut)
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
                responsive: true,
                maintainAspectRatio: false, // Important for the fixed height container
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });
    }

    // Weekly Hours (Tiny Bar)
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
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }

    // Trend (Area)
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
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }
});