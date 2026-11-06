function renderItemEditor(item, itemType) {
  if (!canEditItem(item)) return '';

  const isProgram = itemType === 'program';
  const existingContributors = item.contributers || [];
  const allowedContributors = window.eventContributorNames || [];
  const contributorNames = [...new Set([...allowedContributors, ...existingContributors])];
  const contributors = contributorNames.map(contributor => {
    const isAuthorized = allowedContributors.some(name => name.toLocaleLowerCase() === contributor.toLocaleLowerCase());
    const isSelected = existingContributors.some(name => name.toLocaleLowerCase() === contributor.toLocaleLowerCase());
    return `<option value="${escapeAttributeValue(contributor)}" ${isSelected ? 'selected' : ''} ${isAuthorized ? '' : 'disabled'}>${escapeAttributeValue(contributor)}</option>`;
  }).join('');
  const locations = (window.allLocations || []).map(location => `
    <option value="${escapeAttributeValue(location.name)}" ${item.location === location.name ? 'selected' : ''}>${escapeAttributeValue(location.capacity != null
      ? `${location.name} (${translate('capacity')} ${new Intl.NumberFormat(getPageCollationLocale()).format(location.capacity)})`
      : location.name)}</option>
  `).join('');
  return `
    <details class="item-editor">
      <summary>${translate('editItem')}</summary>
      <form class="item-editor-form" data-edit-type="${itemType}" data-edit-name="${escapeAttributeValue(item.name)}">
        <div class="item-editor-fields">
          <div class="item-editor-field">
            <label>${translate('name')}</label>
            <input name="name" type="text" maxlength="160" value="${escapeAttributeValue(item.name)}" required />
          </div>
          <div class="item-editor-field">
            <label>${translate('contributors')}</label>
            <select name="contributors" multiple size="4">${contributors}</select>
          </div>
          <div class="item-editor-field">
            <label>${translate('language')}</label>
            <input name="languages" type="text" value="${escapeAttributeValue((item.languages || []).join(', '))}" />
          </div>
          <div class="item-editor-field item-editor-description">
            <label>${translate('topicDescription')}</label>
            <textarea name="description" rows="3" maxlength="4000">${escapeAttributeValue(item.desc || '')}</textarea>
          </div>
        </div>
        ${isProgram ? '' : `
          <label class="item-editor-move">
            <input type="checkbox" name="moveToProgram" /> ${translate('moveToProgram')}
          </label>
        `}
        <div class="item-editor-schedule" ${isProgram ? '' : 'hidden'}>
          <div class="item-editor-field">
            <label>${translate('location')}</label>
            <select name="location" ${isProgram ? 'required' : ''}>
              <option value=""></option>${locations}
            </select>
          </div>
          <div class="item-editor-field">
            <label>${translate('date')}</label>
            <input name="date" type="date" value="${escapeAttributeValue(item.date || '')}" ${isProgram ? 'required' : ''} />
          </div>
          <div class="item-editor-field">
            <label>${translate('startTime')}</label>
            <input name="start" type="time" value="${escapeAttributeValue(item.start || '')}" ${isProgram ? 'required' : ''} />
          </div>
          <div class="item-editor-field">
            <label>${translate('endTime')}</label>
            <input name="end" type="time" value="${escapeAttributeValue(item.end || '')}" ${isProgram ? 'required' : ''} />
          </div>
        </div>
        <button class="save-item" type="submit">${translate('saveItem')}</button>
        <p class="item-editor-status" role="status" aria-live="polite"></p>
      </form>
    </details>
  `;
}
