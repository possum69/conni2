function attachDeleteHandlers(root) {
  root.querySelectorAll('.delete-item').forEach(button => {
    button.addEventListener('click', async () => {
      const itemName = button.dataset.deleteName;
      if (!window.confirm(translate('deleteConfirm', { name: itemName }))) return;

      button.disabled = true;
      await deleteItem(button.dataset.deleteType, itemName);
      if (button.isConnected) button.disabled = false;
    });
  });
}
