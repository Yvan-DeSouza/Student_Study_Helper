
export function shouldRenderLockedColumn(columnState) {
    return columnState.visible;
}
// Columns that should NOT show hint icons (self-explanatory)
export const COLUMNS_WITHOUT_HINTS = new Set([
    "title",
    "grade", 
    "due_at",
    "is_completed",
    "class"
]);

export function shouldShowHintIcon(columnKey) {
    return !COLUMNS_WITHOUT_HINTS.has(columnKey);
}
export function lockedCellDisplayMode(columnState) {
    // future-proofing: blur, placeholder, tooltip, etc.
    return "placeholder"; // currently always placeholder
}

export function getLockedTooltip(lockReason) {
    if (!lockReason) return null;

    // JS translates backend diagnostics into human-readable text
    if (lockReason.unlock_hint) {
        return lockReason.unlock_hint;
    }

    return "This column is locked.";
}

/**
 * Build detailed explanation from lock_reason blocking_reasons array
 */
export function buildRequirementExplanation(lockReason) {
    if (!lockReason || !lockReason.blocking_reasons) {
        return "Requirements not met.";
    }

    const lines = [];
    
    for (const reason of lockReason.blocking_reasons) {
        const metric = reason.metric || "unknown";
        const current = reason.current ?? "N/A";
        const required = reason.required ?? "N/A";
        
        // Human-readable metric names
        const metricNames = {
            "graded_assignments": "Graded assignments",
            "completed_assignments": "Completed assignments",
            "assignments_with_due_date": "Assignments with due dates",
            "days_since_earliest_graded": "Days of history",
            "distinct_assignment_types": "Assignment types",
            "assignments_with_expected": "Assignments with time estimates"
        };
        
        const displayName = metricNames[metric] || metric;
        lines.push(`${displayName}: ${current} / ${required}`);
    }
    
    return lines.join("\n");
}

/**
 * Get column description for hints
 */
export function getColumnDescription(columnKey) {
    const descriptions = {
        // Core columns
        "title": "The name of the assignment",
        "assignment_type": "Type of work (quiz, homework, project, etc.)",
        "class": "Which class this assignment belongs to",
        "due_at": "When the assignment is due",
        "is_completed": "Whether you've finished this assignment",
        "grade": "Your score on this assignment",
        "is_graded": "Whether this assignment counts toward your grade",
        
        // Simple columns
        "ponderation": "How much this assignment counts toward your final grade (weight %)",
        "pass_grade": "Minimum grade needed to pass",
        "difficulty": "Your estimated difficulty level (1-10)",
        "expected_grade": "What grade you expect to receive",
        "finished_at": "When you completed the assignment",
        "estimated_minutes": "How long you think it will take",
        
        // Computed columns
        "study_minutes": "Total time you've spent studying for this",
        "study_session_count": "Number of study sessions logged",
        "days_until_due": "How many days until the deadline",
        
        // Advanced columns
        "risk_score": "Combines deadline pressure, difficulty, past performance, and workload to show how at-risk this assignment is",
        "effort_efficiency": "Compares actual time spent vs estimated time to show how accurately you're estimating work",
        "volatility": "Shows how consistent your grades are on similar assignments",
        "deadline_sensitivity": "Measures how deadline timing affects your performance on similar work",
        "predictability_confidence": "How confident the system is in its predictions for this assignment"
    };
    
    return descriptions[columnKey] || "No description available";
}

/**
 * Build diagnostics hint text for unlocked cells
 */
export function buildDiagnosticsHint(columnKey, diagnostics) {
    if (!diagnostics) return null;
    
    const hints = {
        "risk_score": (d) => {
            if (!d.breakdown) return null;
            const parts = [];
            if (d.breakdown.time_pressure != null) parts.push(`Time pressure: ${(d.breakdown.time_pressure * 100).toFixed(0)}%`);
            if (d.breakdown.difficulty != null) parts.push(`Difficulty: ${(d.breakdown.difficulty * 100).toFixed(0)}%`);
            if (d.breakdown.history != null) parts.push(`Historical risk: ${(d.breakdown.history * 100).toFixed(0)}%`);
            if (d.breakdown.overlap != null) parts.push(`Workload overlap: ${(d.breakdown.overlap * 100).toFixed(0)}%`);
            return parts.length ? parts.join("\n") : null;
        },
        
        "effort_efficiency": (d) => {
            const parts = [];
            if (d.ratio != null) parts.push(`Effort ratio: ${d.ratio}x`);
            if (d.actual != null) parts.push(`Actual time: ${d.actual} min`);
            if (d.expected != null){
                if (d.is_guess) parts.push(`Expected time: ${d.expected} min (estimated)`);
                else parts.push(`Expected time: ${d.expected} min`);
            };
            return parts.length ? parts.join("\n") : null;
        },
        
        "volatility": (d) => {
            const parts = [];
            if (d.variance != null) parts.push(`Variance: ${d.variance}`);
            if (d.mean_grade != null) parts.push(`Avg grade: ${d.mean_grade}`);
            if (d.samples != null) parts.push(`Based on ${d.samples} similar assignments`);
            return parts.length ? parts.join("\n") : null;
        },
        
        "deadline_sensitivity": (d) => {
            const parts = [];
            if (d.rho != null) parts.push(`Correlation: ${d.rho}`);
            if (d.samples != null) parts.push(`Based on ${d.samples} assignments`);
            if (d.bucket) parts.push(`Sensitivity: ${d.bucket}`);
            return parts.length ? parts.join("\n") : null;
        },
        
        "predictability_confidence": (d) => {
            const parts = [];
            if (d.bucket) parts.push(`Confidence: ${d.bucket}`);
            if (d.sample_score != null) parts.push(`Sample strength: ${(d.sample_score * 100).toFixed(0)}%`);
            if (d.similarity_score != null) parts.push(`Similarity: ${(d.similarity_score * 100).toFixed(0)}%`);
            if (d.stability_score != null) parts.push(`Stability: ${(d.stability_score * 100).toFixed(0)}%`);
            if (d.recency_score != null) parts.push(`Recency: ${(d.recency_score * 100).toFixed(0)}%`);
            return parts.length ? parts.join("\n") : null;
        }
    };
    
    const builder = hints[columnKey];
    return builder ? builder(diagnostics) : null;
}