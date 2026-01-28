
export async function updateAssignment(assignmentId, payload) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    
    const response = await fetch(`/assignments/${assignmentId}/update`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update assignment");
    }
    
    return await response.json();
}

export async function deleteAssignmentAPI(assignmentId) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    
    const response = await fetch(`/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: {
            "X-CSRFToken": csrfToken
        }
    });
    
    if (!response.ok) {
        throw new Error("Failed to delete assignment");
    }
    
    return await response.json();
}

export async function createAssignment(payload) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    
    const formData = new FormData();
    Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
        }
    });
    
    const response = await fetch("/assignment", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "X-CSRFToken": csrfToken
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create assignment");
    }
    
    return await response.json();
}