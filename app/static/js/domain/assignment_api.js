export async function updateAssignment(id, payload) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

  const res = await fetch(`/assignments/${id}/update`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Update failed");
  }

  return res.json();
}



// static/js/domain/assignment_api.js
export async function deleteAssignmentAPI(id) {
    const csrf = document.querySelector("meta[name='csrf-token']").content;
    const res = await fetch(`/assignments/${id}`, {
        method: "DELETE",
        headers: { "X-CSRFToken": csrf },
    });
    if (!res.ok) throw new Error("Delete failed");
    return true;
}
