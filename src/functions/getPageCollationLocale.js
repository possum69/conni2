function getPageCollationLocale() {
  if (['bar', 'frk', 'hes', 'ksh', 'nds'].includes(currentPageLanguage)) return 'de-DE';
  if (currentPageLanguage === 'fy') return 'nl-NL';
  return currentPageLanguage;
}
