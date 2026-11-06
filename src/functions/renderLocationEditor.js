function renderLocationEditor(location) {
  return `
    <details class="item-editor">
      <summary>${translate('editItem')}</summary>
      <form class="item-editor-form location-editor-form" data-location-name="${escapeAttributeValue(location.name)}">
        <div class="item-editor-fields">
          <div class="item-editor-field">
            <label>${translate('name')}</label>
            <input name="name" type="text" maxlength="160" value="${escapeAttributeValue(location.name)}" required />
          </div>
          <div class="item-editor-field">
            <label>${translate('capacity')}</label>
            <input name="capacity" type="number" min="1" max="100000" step="1" value="${location.capacity ?? ''}" />
          </div>
          <div class="item-editor-field item-editor-description">
            <label>${translate('topicDescription')}</label>
            <textarea name="description" rows="3" maxlength="4000" required>${escapeAttributeValue(location.desc || '')}</textarea>
          </div>
          <div class="item-editor-field item-editor-description">
            <label>${translate('facilities')}</label>
            <input name="facilities" type="text" value="${escapeAttributeValue((location.facilities || []).join(', '))}" />
          </div>
        </div>
        <button class="save-item" type="submit">${translate('saveLocation')}</button>
        <p class="item-editor-status" role="status" aria-live="polite"></p>
      </form>
    </details>
  `;
}
