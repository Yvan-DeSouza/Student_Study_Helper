export async function refreshSingleCard({ classId }) {
    if (!classId) return;

    const container = document.querySelector(`.class-card[data-class-id="${classId}"]`);
    if (!container) return;

    const response = await fetch(`/classes/${classId}/card`);
    if (!response.ok) throw new Error("Failed to fetch card");

    const html = await response.text();
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Look specifically for the class-card element inside temp
    const newCard = temp.querySelector(`.class-card[data-class-id="${classId}"]`);

    if (!newCard) {
        console.error("No card found in fetched HTML for classId:", classId);
        return;
    }

    const cardParent = container.parentElement;
    if (!cardParent) return;

    cardParent.replaceChild(newCard, container);

    // Re-init interactive elements
    import('../inlineEditing.js').then(mod => mod.initInlineEditing());
    import('../classes/completion.js').then(mod => mod.initCompletion());
}
