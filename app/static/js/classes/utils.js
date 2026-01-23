export function getDifficultyColor(value) {
    if (value <= 3) return "#22c55e";
    if (value <= 5) return "#facc15";
    if (value <= 7) return "#fb923c";
    return "#ef4444";
}

export function getGradeColor(grade, passGrade) {
    if (grade === null || isNaN(grade)) return "#9ca3af";

    grade = Math.max(0, Math.min(100, grade));

    if (passGrade !== null && !isNaN(passGrade)) {
        if (grade >= passGrade) return "#22c55e";
        const ratio = grade / passGrade;
        if (ratio < 0.4) return "#ef4444";
        if (ratio < 0.7) return "#fb923c";
        return "#facc15";
    }

    if (grade < 50) return "#ef4444";
    if (grade < 65) return "#fb923c";
    if (grade < 80) return "#facc15";
    return "#22c55e";
}
