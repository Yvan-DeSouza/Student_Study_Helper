export function getClassSelectorState(root = document) {
    return {
        sortBy: root.querySelector("#sortSelect")?.value,
        status: root.querySelector("#statusFilter")?.value,

        importance: {
            high: root.querySelector("input[value='high']")?.checked ?? true,
            medium: root.querySelector("input[value='medium']")?.checked ?? true,
            low: root.querySelector("input[value='low']")?.checked ?? true
        },

        classTypes: [...root.querySelectorAll("input[name='class_type_selector']:checked")]
            .map(cb => cb.id.replace("class_type_selector_", ""))
    };
}
