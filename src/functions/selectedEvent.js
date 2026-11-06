function selectedEvent() {
  return availableEvents.find(event => event.id === document.getElementById('event-select').value);
}
