async function deleteItem(itemType, itemName) {
  try {
    const response = await fetch(eventApiUrl('/api/items'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemName })
    });
    if (!response.ok) throw new Error('Delete failed');

    const result = await response.json();
    const programLanguage = document.getElementById('program-language-filter').value;
    const programLikedBy = document.getElementById('program-liked-filter').value;
    const topicsLanguage = document.getElementById('topics-language-filter').value;
    const topicsLikedBy = document.getElementById('topics-liked-filter').value;

    if (result.itemType === 'program') {
      window.allProgramItems = (window.allProgramItems || []).filter(item => item.name !== result.item.name);
    } else {
      window.allTopics = (window.allTopics || []).filter(item => item.name !== result.item.name);
    }

    populateLanguageFilters(window.allProgramItems || [], window.allTopics || []);
    const restoreSelection = (id, value) => {
      const select = document.getElementById(id);
      if (Array.from(select.options).some(option => option.value === value)) select.value = value;
    };
    restoreSelection('program-language-filter', programLanguage);
    restoreSelection('program-liked-filter', programLikedBy);
    restoreSelection('topics-language-filter', topicsLanguage);
    restoreSelection('topics-liked-filter', topicsLikedBy);
    renderCurrentViews();
    if (result.itemType === 'program') renderLocations(window.allLocations || []);
    document.getElementById('user-name-status').textContent = translate('itemDeleted');
    return true;
  } catch {
    document.getElementById('user-name-status').textContent = translate('deleteFailed');
    return false;
  }
}
