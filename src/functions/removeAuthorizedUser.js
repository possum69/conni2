async function removeAuthorizedUser(userId, login) {
  const status = document.getElementById('authorized-user-status');
  status.textContent = '';
  try {
    const response = await fetch('/api/events/authorized-users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: selectedEvent().id, userId, login })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || translate('authorizedUserFailed'));
    selectedEvent().authorizedUsers = result.authorizedUsers;
    renderAuthorizedUsers();
    status.textContent = translate('authorizedUserRemoved');
  } catch (error) {
    status.textContent = error.message || translate('authorizedUserFailed');
  }
}
