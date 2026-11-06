async function activateEvent(event) {
  currentEventId = event.id;
  currentEvent = null;
  document.getElementById('current-event-name').textContent = event.name;
  document.getElementById('active-event-label').hidden = false;
  try {
    localStorage.setItem('conni2-event-id', currentEventId);
  } catch {}
  document.getElementById('event-setup-overlay').hidden = true;
  await loadData();
}
