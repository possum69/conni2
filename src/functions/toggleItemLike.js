async function toggleItemLike(itemType, itemName) {
  if (!currentUserName) return;
  const items = itemType === 'program' ? window.allProgramItems || [] : window.allTopics || [];
  const item = items.find(candidate => candidate.name === itemName);
  if (!item) return;

  try {
    const response = await fetch(eventApiUrl('/api/like'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemType,
        itemName,
        userName: currentUserName,
        liked: !getItemLikeState(item, itemType).liked
      })
    });
    if (!response.ok) throw new Error('Could not save like');

    const result = await response.json();
    const updatedItems = result.itemType === 'program' ? window.allProgramItems : window.allTopics;
    const updatedItem = updatedItems.find(candidate => candidate.name === result.item.name);
    if (updatedItem) Object.assign(updatedItem, result.item);

    document.getElementById('user-name-status').textContent = translate('saved');
    renderCurrentViews();
  } catch {
    document.getElementById('user-name-status').textContent = translate('likesSaveFailed');
  }
}
