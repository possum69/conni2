function renderTopics(items, selectedLanguage = 'all', sortMode = 'date', showOnlyTopics = false, detailMode = 'full', searchText = '', likedBy = 'all') {
  const root = document.getElementById('topics-cards');
  const topicItems = (selectedLanguage === 'all'
    ? items
    : items.filter(item => (item.languages || []).includes(selectedLanguage)))
    .filter(item => matchesSearch(item, searchText))
    .filter(item => matchesLikedBy(item, likedBy, 'topics'))
    .slice();

  const programItems = (selectedLanguage === 'all'
    ? window.allProgramItems || []
    : (window.allProgramItems || []).filter(item => (item.languages || []).includes(selectedLanguage)))
    .filter(item => matchesSearch(item, searchText))
    .filter(item => matchesLikedBy(item, likedBy, 'program'))
    .slice();

  const mergedItems = showOnlyTopics ? topicItems : [...programItems, ...topicItems];

  const sortedItems = mergedItems.slice().sort((a, b) => {
    if (sortMode === 'likes') {
      const typeA = a.date ? 'program' : 'topics';
      const typeB = b.date ? 'program' : 'topics';
      return getItemLikeState(b, typeB).likeCount - getItemLikeState(a, typeA).likeCount || a.name.localeCompare(b.name);
    }

    if (sortMode === 'name') {
      return a.name.localeCompare(b.name);
    }

    const dateA = a.date || '0000-00-00';
    const dateB = b.date || '0000-00-00';
    const timeA = a.start || '00:00';
    const timeB = b.start || '00:00';
    const sortA = `${dateA}T${timeA}:00`;
    const sortB = `${dateB}T${timeB}:00`;
    return new Date(sortA) - new Date(sortB);
  });

  document.getElementById('topics-item-count').textContent = translate('itemsShown', {
    count: new Intl.NumberFormat(getPageCollationLocale()).format(sortedItems.length)
  });

  root.innerHTML = sortedItems.length
    ? sortedItems.map(item => {
        const isProgram = !!item.date;
        return `
          <article class="card">
            <span class="badge">${translate(isProgram ? 'programBadge' : 'topicBadge')}</span>
            <h3>${escapeAttributeValue(item.name)}</h3>
            ${detailMode === 'full' ? `<p>${escapeAttributeValue(item.desc || '')}</p>` : ''}
            ${isProgram ? `
              <div class="meta">
                <a href="#" class="chip chip-link" data-location="${escapeAttributeValue(item.location || '')}">${escapeAttributeValue(item.location || '')}</a>
                <span class="chip">${formatProgramDate(item.date)}</span>
                <span class="chip">${item.start} - ${item.end}</span>
                <span class="chip">${translate('minutes', { count: item.duration })}</span>
              </div>
            ` : ''}
            ${detailMode === 'full' ? `
              <div class="meta">
                ${(item.languages || []).map(lang => `<span class="chip">${escapeAttributeValue(lang)}</span>`).join('')}
              </div>
              <p><strong>${translate('likers')}</strong></p>
              <ul>${(item.contributers || []).map(name => `<li>${escapeAttributeValue(name)}</li>`).join('')}</ul>
            ` : ''}
            ${renderLikeControl(item, isProgram ? 'program' : 'topics')}
            ${renderItemEditor(item, isProgram ? 'program' : 'topics')}
            ${renderDeleteControl(item, isProgram ? 'program' : 'topics')}
          </article>
        `;
      }).join('')
    : `<p class="loading">${translate('itemsNoMatches')}</p>`;

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
