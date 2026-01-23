// static/js/classes/utils.js

// Class type emoji mapping
export const class_type_emojis = {
    math: "🔢",
    science: "🔬",
    language: "📖",
    social_science: "🌍",
    art: "🎨",
    engineering: "⚙️",
    technology: "💻",
    finance: "💰",
    other: "📚"
};

// Importance color mapping
export const importance_colors = {
    high: "#ef4444",    // red
    medium: "#facc15",  // yellow
    low: "#22c55e"      // green
};

// Default class colors by type
export const default_class_colors = {
    math: "#3b82f6",           // blue
    science: "#22c55e",        // green
    language: "#f59e0b",       // amber
    social_science: "#8b5cf6", // purple
    art: "#ec4899",            // pink
    engineering: "#6366f1",    // indigo
    technology: "#06b6d4",     // cyan
    finance: "#10b981",        // emerald
    other: "#4f46e5"           // default indigo
};

// Get difficulty color based on value
export function getDifficultyColor(value) {
    if (value <= 3) return "#22c55e";   // green
    if (value <= 5) return "#facc15";   // yellow
    if (value <= 7) return "#fb923c";   // orange
    return "#ef4444";                   // red
}

// Get grade color based on grade and pass grade
export function getGradeColor(grade, passGrade) {
    if (grade === null || isNaN(grade)) {
        return "#9ca3af"; // neutral
    }

    grade = Math.max(0, Math.min(100, grade));

    // CASE 1: Grade + pass grade
    if (passGrade !== null && !isNaN(passGrade)) {
        if (grade >= passGrade) {
            return "#22c55e"; // green
        }

        const ratio = grade / passGrade;

        if (ratio < 0.4) return "#ef4444";   // red
        if (ratio < 0.7) return "#fb923c";   // orange
        return "#facc15";                    // yellow
    }

    // CASE 2: Grade only (0–100)
    if (grade < 50) return "#ef4444";        // red
    if (grade < 65) return "#fb923c";        // orange
    if (grade < 80) return "#facc15";        // yellow
    return "#22c55e";                        // green
}

// Initialize visual elements (dots, emojis, bars)
export function initVisualElements() {
    // Class color dots
    document.querySelectorAll(".class-dot").forEach(dot => {
        const color = dot.dataset.color;
        if (color) {
            dot.style.backgroundColor = color;
        }
    });

    // Class type emoji injection
    document.querySelectorAll(".class-type").forEach(el => {
        const type = el.dataset.type;
        if (class_type_emojis[type]) {
            el.textContent = `${class_type_emojis[type]} ${el.textContent}`;
        }
    });

    // Importance dot coloring
    document.querySelectorAll(".importance-dot").forEach(dot => {
        const level = dot.dataset.importance;
        if (importance_colors[level]) {
            dot.style.backgroundColor = importance_colors[level];
        }
    });

    // Difficulty bars
    document.querySelectorAll(".difficulty-value").forEach(el => {
        const difficulty = parseInt(el.dataset.difficulty, 10);
        if (isNaN(difficulty)) return;

        const bar = document.createElement("span");
        bar.className = "difficulty-bar";

        const fill = document.createElement("span");
        fill.className = "difficulty-bar-fill";
        fill.style.width = `${difficulty * 10}%`;
        fill.style.backgroundColor = getDifficultyColor(difficulty);

        bar.appendChild(fill);
        el.insertAdjacentElement("afterend", bar);
    });

    // Grade dots
    document.querySelectorAll(".class-card").forEach(card => {
        const display = card.querySelector(".grade-display");
        const dot = card.querySelector(".grade-dot");

        if (!display || !dot) return;

        const gradeRaw = display.dataset.grade;
        const passRaw = display.dataset.passGrade;

        const grade = gradeRaw !== "" && gradeRaw !== null
            ? parseFloat(gradeRaw)
            : null;

        const passGrade = passRaw !== "" && passRaw !== null
            ? parseFloat(passRaw)
            : null;

        dot.style.backgroundColor = getGradeColor(grade, passGrade);
    });
}

// Validate inline grade input
export function validateGradeInput(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
}