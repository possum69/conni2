async function saveLocation(form) {
  const formData = new FormData(form);
  const status = form.querySelector('.item-editor-status');
  const saveButton = form.querySelector('.save-item');
  const splitValues = value => value.split(',').map(part => part.trim()).filter(Boolean);
  saveButton.disabled = true;
  status.textContent = '';

  try {
    const response = await fetch(eventApiUrl('/api/locations'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemName: form.dataset.locationName,
        name: formData.get('name'),
        description: formData.get('description'),
        capacity: formData.get('capacity') ? Number(formData.get('capacity')) : null,
        facilities: splitValues(formData.get('facilities'))
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || translate('locationSaveFailed'));

    window.allLocations = (window.allLocations || []).map(location =>
      location.name === result.previousName ? result.location : location
    );
    window.allProgramItems = (window.allProgramItems || []).map(item =>
      item.location === result.previousName
        ? { ...item, location: result.location.name }
        : item
    );
    renderCurrentViews();
    renderLocations(window.allLocations);
    document.getElementById('user-name-status').textContent = translate('locationSaved');
  } catch (error) {
    status.textContent = error.message || translate('locationSaveFailed');
  } finally {
    if (saveButton.isConnected) saveButton.disabled = false;
  }
}
