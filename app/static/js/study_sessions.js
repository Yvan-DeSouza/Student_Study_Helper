document.addEventListener('DOMContentLoaded', () => {

    const classSelect = document.getElementById("study-class");
    const assignmentSelect = document.getElementById("study-assignment");

    if (!classSelect || !assignmentSelect) {
        console.log("Either classSelect or assignmentSelect not found!");
        return;
    }

    // Save original assignments (clone them)
    const allAssignments = Array.from(assignmentSelect.querySelectorAll('option[data-class]')).map(opt => opt.cloneNode(true));

    function filterAssignments() {
        const selectedClass = String(classSelect.value).trim();

        // Clear current options
        assignmentSelect.innerHTML = '';
        assignmentSelect.appendChild(new Option('None', ''));

        const matchingAssignments = allAssignments.filter(opt => String(opt.getAttribute('data-class')).trim() === selectedClass);

        matchingAssignments.forEach(opt => assignmentSelect.appendChild(opt.cloneNode(true)));

        assignmentSelect.disabled = matchingAssignments.length === 0;
    }

    // Initial filter
    filterAssignments();

    // Update whenever class changes
    classSelect.addEventListener('change', filterAssignments);
});
