function renderProgramCalendar(items) {
  const days = new Map();
  items.forEach(item => {
    const date = item.date || translate('dateNotSet');
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(item);
  });

  return `
    <div class="program-calendar">
      ${Array.from(days, ([date, dayItems]) => `
        <section class="calendar-day">
          <h3>${formatProgramDate(date)}</h3>
          <div class="calendar-events">
            ${dayItems.map(item => `
              <article class="calendar-event" data-program-name="${escapeAttributeValue(item.name)}">
                <span class="calendar-time">${escapeAttributeValue(item.start || '')}${item.end ? ` - ${escapeAttributeValue(item.end)}` : ''}</span>
                <strong>${escapeAttributeValue(item.name)}</strong>
                ${item.location ? `<a href="#" class="chip-link" data-location="${escapeAttributeValue(item.location)}">${escapeAttributeValue(item.location)}</a>` : ''}
                ${renderLikeControl(item, 'program')}
                ${renderItemEditor(item, 'program')}
                ${renderDeleteControl(item, 'program')}
              </article>
            `).join('')}
          </div>
        </section>
      `).join('')}
    </div>
  `;
}
