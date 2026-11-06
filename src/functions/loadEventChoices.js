async function loadEventChoices() {
  const status = document.getElementById('event-setup-status');
  const selector = document.getElementById('event-select');
  try {
    const response = await fetch('/api/events');
    if (!response.ok) throw new Error(translate('eventLoadFailed'));
    const result = await response.json();
    availableEvents = result.events;
    selector.replaceChildren();
    document.getElementById('event-manage-panel').hidden = true;
    if (!availableEvents.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = translate('noEvents');
      selector.append(option);
      selector.disabled = true;
      document.querySelector('#event-select-form button[type="submit"]').disabled = true;
      return;
    }

    availableEvents.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = event.name;
      selector.append(option);
    });
    selector.disabled = false;
    document.querySelector('#event-select-form button[type="submit"]').disabled = false;
    try {
      const previousEventId = localStorage.getItem('conni2-event-id');
      if (availableEvents.some(event => event.id === previousEventId)) {
        selector.value = previousEventId;
      }
    } catch {}
    updateEventManagementForm();
    status.textContent = '';
  } catch (error) {
    status.textContent = error.message || translate('eventLoadFailed');
  }
}
