async function saveItem(form) {
  const sourceType = form.dataset.editType;
  const itemName = form.dataset.editName;
  const formData = new FormData(form);
  const splitValues = value => value.split(',').map(part => part.trim()).filter(Boolean);
  const selectedContributors = Array.from(form.querySelectorAll('select[name="contributors"] option:checked'), option => option.value);
  const moveToProgram = formData.get('moveToProgram') === 'on';
  const targetType = sourceType === 'topics' && !moveToProgram ? 'topics' : 'program';
  const status = form.querySelector('.item-editor-status');
  const saveButton = form.querySelector('.save-item');
  saveButton.disabled = true;
  status.textContent = '';

  try {
    const response = await fetch(eventApiUrl('/api/items'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemType: sourceType,
        targetType,
        itemName,
        name: formData.get('name'),
        description: formData.get('description'),
        contributors: selectedContributors,
        languages: splitValues(formData.get('languages')),
        location: formData.get('location'),
        date: formData.get('date'),
        start: formData.get('start'),
        end: formData.get('end')
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || translate('itemSaveFailed'));

    const sourceItems = sourceType === 'program' ? window.allProgramItems : window.allTopics;
    const targetItems = targetType === 'program' ? window.allProgramItems : window.allTopics;
    const remainingItems = sourceItems.filter(item => item.name !== itemName);
    if (sourceType === targetType) {
      const index = sourceItems.findIndex(item => item.name === itemName);
      sourceItems[index] = result.item;
    } else {
      window[sourceType === 'program' ? 'allProgramItems' : 'allTopics'] = remainingItems;
      targetItems.push(result.item);
    }

    populateLanguageFilters(window.allProgramItems || [], window.allTopics || []);
    renderCurrentViews();
    renderLocations(window.allLocations || []);
    document.getElementById('user-name-status').textContent = translate('itemSaved');
  } catch (error) {
    status.textContent = error.message || translate('itemSaveFailed');
  } finally {
    if (saveButton.isConnected) saveButton.disabled = false;
  }
}
