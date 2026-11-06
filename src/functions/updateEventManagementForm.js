function updateEventManagementForm() {
  const event = selectedEvent();
  const panel = document.getElementById('event-manage-panel');
  const canManage = event && event.creatorId === currentUserId;
  panel.hidden = !canManage;
  document.getElementById('event-manage-status').textContent = '';
  if (canManage) {
    document.getElementById('managed-event-name').value = event.name;
    renderAuthorizedUsers();
  }
}
