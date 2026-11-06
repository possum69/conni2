function renderDeleteControl(item, itemType) {
  if (!canManageItem(item)) return '';

  const label = translate('deleteItem');
  return `
    <button
      class="delete-item"
      type="button"
      data-delete-type="${itemType}"
      data-delete-name="${escapeAttributeValue(item.name)}"
      aria-label="${escapeAttributeValue(label)}: ${escapeAttributeValue(item.name)}"
      title="${escapeAttributeValue(label)}"
    >${label}</button>
  `;
}
