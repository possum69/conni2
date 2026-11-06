function initializeLocationCreation() {
  const form = document.getElementById('create-location-form');
  const submitButton = form.querySelector('button[type="submit"]');
  const status = document.getElementById('location-create-status');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    submitButton.disabled = true;
    status.textContent = '';
    const formData = new FormData(form);
    const splitValues = value => value.split(',').map(part => part.trim()).filter(Boolean);

    try {
      const response = await fetch(eventApiUrl('/api/locations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          capacity: formData.get('capacity') ? Number(formData.get('capacity')) : null,
          facilities: splitValues(formData.get('facilities'))
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || translate('locationSaveFailed'));

      window.allLocations.push(result.location);
      renderLocations(window.allLocations);
      form.reset();
      status.textContent = translate('locationSaved');
      form.closest('details').open = false;
    } catch (error) {
      status.textContent = error.message || translate('locationSaveFailed');
    } finally {
      submitButton.disabled = false;
    }
  });
}
