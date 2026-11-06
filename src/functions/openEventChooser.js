function openEventChooser() {
  document.getElementById('event-setup-overlay').hidden = false;
  document.getElementById('profile-setup-step').hidden = true;
  document.getElementById('event-setup-step').hidden = false;
  document.getElementById('event-setup-status').textContent = '';
  loadEventChoices();
}
