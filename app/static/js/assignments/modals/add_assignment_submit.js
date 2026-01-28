import { createAssignment } from "../../domain/assignment_api.js";
import { closeModal } from "../../core/modalManager.js";
import { emitRefresh } from "../../core/refreshBus.js";

export function initAddAssignmentSubmit() {
    const form = document.querySelector('form[action="/assignment"]');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Prevent double submission
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;

        try {
            const formData = new FormData(form);
            const payload = {};
            const classId = parseInt(formData.get('class_id')) || null;
            
            formData.forEach((value, key) => {
                if (value !== '' && key !== 'csrf_token') {
                    payload[key] = value;
                }
            });

            const result = await createAssignment(payload);
            
            // Reset form
            form.reset();
            
            // Close modal
            closeModal("addAssignmentModal");
            
            // Emit granular refresh events
            if (classId) {
                await emitRefresh({ key: "assignments:table", payload: { classId } });
            } else {
                await emitRefresh("assignments:table");
            }
            await emitRefresh("assignments:charts");
            await emitRefresh("assignments:deadlines");
            
        } catch (error) {
            console.error("Error creating assignment:", error);
            alert("Failed to create assignment. Please try again.");
        } finally {
            submitBtn.disabled = false;
        }
    });
}