import { showModal } from '../../core/modalManager.js';
import { openAddClassModal } from './add_class.js';
import { openEditClassModal } from './edit_class.js';
import { openDeleteClassModal } from './delete_class.js';

document.addEventListener("modal:open", (e) => {
  const { feature, mode, source } = e.detail;
  if (feature === 'class') {
    if (mode === 'add') {
      openAddClassModal();
    } else if (mode === 'edit') {
      openEditClassModal(source);
    } else if (mode === 'delete') {
      openDeleteClassModal(source);
    }
  }
});