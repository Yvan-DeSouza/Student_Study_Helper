export async function fetchFilteredClassIds(state, page = "classes") {
    const payload = {
        page,
        sort: state.sortBy,
        filters: {
            status: state.status,
            importance: state.importance,
            class_types: state.classTypes
        }
    };



    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    const res = await fetch("/api/select/classes", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        throw new Error("Failed to fetch filtered classes");
    }

    const data = await res.json();
    console.log("Filtered class IDs:", data.classes.map(c => String(c.class_id)));
    return data.classes.map(c => String(c.class_id));
}
