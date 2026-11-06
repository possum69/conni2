function attachItemEditorHandlers(root) {
  root.querySelectorAll('.item-editor-form').forEach(form => {
    const moveToggle = form.querySelector('[name="moveToProgram"]');
    const scheduleFields = form.querySelector('.item-editor-schedule');
    if (moveToggle) {
      moveToggle.addEventListener('change', () => {
        scheduleFields.hidden = !moveToggle.checked;
        scheduleFields.querySelectorAll('input, select').forEach(field => {
          field.required = moveToggle.checked;
        });
      });
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      saveItem(form);
    });
  });
}
