function attachLocationEditorHandlers(root) {
  root.querySelectorAll('.location-editor-form').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      saveLocation(form);
    });
  });
}
