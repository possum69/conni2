function renderProgram(items, selectedLanguage = 'all', detailMode = 'full', searchText = '', likedBy = 'all') {
  const root = document.getElementById('program-cards');
  const viewMode = document.getElementById('program-view-filter').value;
  document.getElementById('program-detail-filter-group').hidden = viewMode === 'calendar';
  const filteredItems = (selectedLanguage === 'all'
    ? items
    : items.filter(item => (item.languages || []).includes(selectedLanguage)))
    .filter(item => matchesSearch(item, searchText))
    .filter(item => matchesLikedBy(item, likedBy, 'program'))
    .slice()
    .sort((a, b) => new Date(getSortDateTimeValue(a)) - new Date(getSortDateTimeValue(b)));

  document.getElementById('program-item-count').textContent = translate('itemsShown', {
    count: new Intl.NumberFormat(getPageCollationLocale()).format(filteredItems.length)
  });

  root.innerHTML = filteredItems.length
    ? viewMode === 'calendar'
      ? renderProgramCalendar(filteredItems)
      : filteredItems.map(item => `
        <article class="card" data-program-name="${escapeAttributeValue(item.name)}">
          <span class="badge">${translate('programBadge')}</span>
          <h3>${escapeAttributeValue(item.name)}</h3>
          ${detailMode === 'full' ? `<p>${escapeAttributeValue(item.desc || '')}</p>` : ''}
          <div class="meta">
            <a href="#" class="chip chip-link" data-location="${escapeAttributeValue(item.location || '')}">${escapeAttributeValue(item.location || '')}</a>
            <span class="chip">${formatProgramDate(item.date)}</span>
            <span class="chip">${item.start} - ${item.end}</span>
            <span class="chip">${translate('minutes', { count: item.duration })}</span>
          </div>
          ${detailMode === 'full' ? `
            <div class="meta">
              ${(item.languages || []).map(lang => `<span class="chip">${escapeAttributeValue(lang)}</span>`).join('')}
            </div>
            <p><strong>${translate('contributors')}</strong></p>
            <ul>${(item.contributers || []).map(name => `<li>${escapeAttributeValue(name)}</li>`).join('')}</ul>
          ` : ''}
          ${renderLikeControl(item, 'program')}
          ${renderItemEditor(item, 'program')}
          ${renderDeleteControl(item, 'program')}
        </article>
      `).join('')
    : `<p class="loading">${translate('programNoMatches')}</p>`;

  attachLikeHandlers(root);
  attachItemEditorHandlers(root);
  attachDeleteHandlers(root);
  document.querySelectorAll('[data-location]').forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const name = event.currentTarget.dataset.location;
      openLocationTab(name);
    });
  });
}
