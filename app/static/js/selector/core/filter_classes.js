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

    const res = await fetch("/api/select/classes2", {
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
    console.log(data)
    return data
}
