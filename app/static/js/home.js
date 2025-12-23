document.addEventListener('DOMContentLoaded', () => {
    
    // ===== GRADED CHECKBOX LOGIC =====
    const gradedCheckbox = document.getElementById("is-graded");
    const ponderationBox = document.getElementById("ponderation-container");
    const ponderationInput = document.getElementById("ponderation");

    if (gradedCheckbox && ponderationBox && ponderationInput) {

        const updatePonderationVisibility = () => {
            if (gradedCheckbox.checked) {
                ponderationBox.classList.remove("hidden");
                ponderationInput.required = true;
            } else {
                ponderationBox.classList.add("hidden");
                ponderationInput.required = false;
                ponderationInput.value = "";
            }
        };

        // Run once on page load
        updatePonderationVisibility();

        // Run whenever checkbox changes
        gradedCheckbox.addEventListener("change", updatePonderationVisibility);
    }

    // --- 1. IMAGE SWAPPER LOGIC ---
    const themeBtn = document.getElementById('home-theme-btn');

    const toggleImages = {
        'theme-img-logo': 'study_logo',
        'theme-img-laptop': 'computer',
        'theme-img-books': 'stack_books'
    };

    function updateImages() {
        setTimeout(() => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const suffix = currentTheme === 'dark' ? '_dark' : '';

            for (const [id, baseName] of Object.entries(toggleImages)) {
                const img = document.getElementById(id);
                if (img) {
                    img.src = `/static/images/${baseName}${suffix}.png`;
                }
            }
        }, 50);
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', updateImages);
        updateImages();
    }

    // --- 2. ADD CLASS MODAL LOGIC ---
    const openBtn = document.getElementById("openAddClassModal");
    const closeBtn = document.getElementById("closeAddClassModal");
    const modal = document.getElementById("addClassModal");

    if (openBtn && closeBtn && modal) {
        openBtn.addEventListener("click", () => {
            modal.classList.add("active");
            document.body.style.overflow = "hidden";
        });

        closeBtn.addEventListener("click", () => {
            modal.classList.remove("active");
            document.body.style.overflow = "auto";
        });
    }

    // --- 3. CLASS TYPE → COLOR AUTO-FILL ---
    const classTypeSelect = document.getElementById("classTypeSelect");
    const colorInput = document.getElementById("classColor");


    if (classTypeSelect && colorInput) {
        classTypeSelect.addEventListener("change", () => {
            const type = classTypeSelect.value;
            if (DEFAULT_COLORS[type]) {
                colorInput.value = DEFAULT_COLORS[type];
            }
        });
    }
});
