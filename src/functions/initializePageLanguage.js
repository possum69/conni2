function initializePageLanguage() {
  const selector = document.getElementById('page-language-filter');
  try {
    const savedLanguage = localStorage.getItem(pageLanguageStorageKey);
    if (window.pageTranslations[savedLanguage]) {
      currentPageLanguage = savedLanguage;
    }
  } catch {
    currentPageLanguage = 'en';
  }
  selector.value = currentPageLanguage;
  selector.addEventListener('change', () => {
    currentPageLanguage = selector.value;
    try {
      localStorage.setItem(pageLanguageStorageKey, currentPageLanguage);
    } catch {}
    applyPageTranslations();
  });
  applyPageTranslations();
}
