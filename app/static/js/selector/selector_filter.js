export function filterAndSortClasses(items, state) {
    const IMPORTANCE_RANK = {
        high: 3,
        medium: 2,
        low: 1
    };

    let result = [...items];

    // STATUS
    if (state.status !== "all") {
        result = result.filter(el => el.dataset.finished === state.status);
    }

    // IMPORTANCE
    result = result.filter(el => {
        const imp = el.dataset.importance;
        if (!imp) return true;
        return state.importance[imp];
    });

    // CLASS TYPE (normalize both sides)
    if (state.classTypes.length > 0) {
        result = result.filter(el => {
            const elType = (el.dataset.classType || '')
                .toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/-/g, '_');
            return state.classTypes.includes(elType);
        });
    }

    // SORT - treat missing values as "last"
    const isEmpty = v => (v === "" || v == null);
    const cmpMissingLast = (aEmpty, bEmpty, cmp) => {
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1; // a after b
        if (bEmpty) return -1; // b after a
        return cmp();
    };
    const num = v => Number(v);

    result.sort((a, b) => {
        switch (state.sortBy) {
            case "name_asc":
                return cmpMissingLast(isEmpty(a.dataset.name), isEmpty(b.dataset.name), () => a.dataset.name.localeCompare(b.dataset.name));

            case "name_desc":
                return cmpMissingLast(isEmpty(a.dataset.name), isEmpty(b.dataset.name), () => b.dataset.name.localeCompare(a.dataset.name));

            case "importance_high_low":
                return cmpMissingLast(isEmpty(a.dataset.importance), isEmpty(b.dataset.importance), () => (IMPORTANCE_RANK[b.dataset.importance] ?? 0) - (IMPORTANCE_RANK[a.dataset.importance] ?? 0));

            case "importance_low_high":
                return cmpMissingLast(isEmpty(a.dataset.importance), isEmpty(b.dataset.importance), () => (IMPORTANCE_RANK[a.dataset.importance] ?? 0) - (IMPORTANCE_RANK[b.dataset.importance] ?? 0));

            case "difficulty_high_low":
                return cmpMissingLast(isEmpty(a.dataset.difficulty), isEmpty(b.dataset.difficulty), () => num(b.dataset.difficulty) - num(a.dataset.difficulty));

            case "difficulty_low_high":
                return cmpMissingLast(isEmpty(a.dataset.difficulty), isEmpty(b.dataset.difficulty), () => num(a.dataset.difficulty) - num(b.dataset.difficulty));

            case "grade_high_low":
                return cmpMissingLast(isEmpty(a.dataset.grade), isEmpty(b.dataset.grade), () => num(b.dataset.grade) - num(a.dataset.grade));

            case "grade_low_high":
                return cmpMissingLast(isEmpty(a.dataset.grade), isEmpty(b.dataset.grade), () => num(a.dataset.grade) - num(b.dataset.grade));

            case "created_newest":
                return cmpMissingLast(isEmpty(a.dataset.createdAt), isEmpty(b.dataset.createdAt), () => num(b.dataset.createdAt) - num(a.dataset.createdAt));

            case "created_oldest":
                return cmpMissingLast(isEmpty(a.dataset.createdAt), isEmpty(b.dataset.createdAt), () => num(a.dataset.createdAt) - num(b.dataset.createdAt));

            default:
                return 0;
        }
    });

    return result;
}
