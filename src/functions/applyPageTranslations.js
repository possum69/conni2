function applyPageTranslations() {
  document.documentElement.lang = currentPageLanguage;
  document.documentElement.dir = ['ar', 'he'].includes(currentPageLanguage) ? 'rtl' : 'ltr';
  sortPageLanguageOptions();
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = translate(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    element.placeholder = translate(element.dataset.i18nPlaceholder);
  });

  ['program-language-filter', 'topics-language-filter'].forEach(id => {
    const allOption = document.getElementById(id).querySelector('option[value="all"]');
    if (allOption) allOption.textContent = translate('all');
  });

  const programLikedFilter = document.getElementById('program-liked-filter');
  const topicsLikedFilter = document.getElementById('topics-liked-filter');
  const selectedProgramLikes = programLikedFilter.value;
  const selectedTopicLikes = topicsLikedFilter.value;
  populateLikerFilters();
  if (Array.from(programLikedFilter.options).some(option => option.value === selectedProgramLikes)) {
    programLikedFilter.value = selectedProgramLikes;
  }
  if (Array.from(topicsLikedFilter.options).some(option => option.value === selectedTopicLikes)) {
    topicsLikedFilter.value = selectedTopicLikes;
  }

  document.getElementById('user-name-status').textContent = '';

  if (window.allProgramItems) {
    renderCurrentViews();
    renderLocations(window.allLocations || []);
  }
}
