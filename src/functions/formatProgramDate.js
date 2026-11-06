function formatProgramDate(dateValue) {
  const [year, month, day] = (dateValue || '').split('-').map(Number);
  if (!year || !month || !day) return dateValue || 'Date not set';

  const germanDialects = ['bar', 'frk', 'hes', 'ksh', 'nds'];
  const fallbackLocale = currentPageLanguage === 'fy' ? 'nl-NL' : 'de-DE';
  const dateLocale = germanDialects.includes(currentPageLanguage)
    ? 'de-DE'
    : Intl.DateTimeFormat.supportedLocalesOf([currentPageLanguage]).length
      ? currentPageLanguage
      : fallbackLocale;
  return new Intl.DateTimeFormat(dateLocale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(year, month - 1, day));
}
