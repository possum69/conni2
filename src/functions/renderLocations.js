function renderLocations(items) {
  const root = document.getElementById('locations-cards');
  const programItems = window.allProgramItems || [];
  root.innerHTML = items.map(location => {
    const matchingItems = programItems.filter(programItem => programItem.location === location.name);
    const programNames = matchingItems.length
      ? matchingItems.map(programItem => `
          <li>
            <a href="#" class="program-item-link" data-program-item="${escapeAttributeValue(programItem.name)}">${escapeAttributeValue(programItem.name)}</a><br>
            ${escapeAttributeValue(programItem.date || '')} • ${escapeAttributeValue(programItem.start || '')} - ${escapeAttributeValue(programItem.end || '')}
          </li>
        `).join('')
      : `<li>${translate('noProgramItems')}</li>`;

    return `
      <article id="location-${escapeAttributeValue(location.name)}" class="card">
        <span class="badge">${translate('locationBadge')}</span>
        <h3>${escapeAttributeValue(location.name)}</h3>
        <p>${escapeAttributeValue(location.desc || '')}</p>
        ${location.capacity != null ? `<p><strong>${translate('capacity')}</strong> ${location.capacity}</p>` : ''}
        ${(location.facilities || []).length ? `
          <p><strong>${translate('facilities')}</strong></p>
          <div class="meta">
            ${location.facilities.map(facility => `<span class="chip">${escapeAttributeValue(facility)}</span>`).join('')}
          </div>
        ` : ''}
        ${renderLocationEditor(location)}
        <p><strong>${translate('programItems')}</strong></p>
        <ul>${programNames}</ul>
      </article>
    `;
  }).join('');

  attachLocationEditorHandlers(root);
  root.onclick = event => {
    const link = event.target.closest('[data-program-item]');
    if (!link) return;

    event.preventDefault();
    openProgramItem(link.dataset.programItem);
  };
}
