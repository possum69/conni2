function populateLanguageFilters(programItems, topicItems) {
  const allLanguages = new Set();
  [...programItems, ...topicItems].forEach(item => {
    (item.languages || []).forEach(language => allLanguages.add(language));
  });

  const programSelect = document.getElementById('program-language-filter');
  const programLikedFilter = document.getElementById('program-liked-filter');
  const programSearch = document.getElementById('program-search-filter');
  const programDetailFilter = document.getElementById('program-detail-filter');
  const programViewFilter = document.getElementById('program-view-filter');
  const topicSelect = document.getElementById('topics-language-filter');
  const topicsLikedFilter = document.getElementById('topics-liked-filter');
  const topicsSearch = document.getElementById('topics-search-filter');
  const topicsDetailFilter = document.getElementById('topics-detail-filter');
  const topicsTypeFilter = document.getElementById('topics-type-filter');
  const topicsSortSelect = document.getElementById('topics-sort-select');

  const collator = new Intl.Collator(getPageCollationLocale(), { sensitivity: 'base' });
  const languages = Array.from(allLanguages).sort((a, b) => collator.compare(a, b));
  const options = [`<option value="all">${translate('all')}</option>`]
    .concat(languages.map(language => `<option value="${escapeAttributeValue(language)}">${escapeAttributeValue(language)}</option>`))
    .join('');

  programSelect.innerHTML = options;
  topicSelect.innerHTML = options;
  populateLikerFilters();

  programSelect.onchange = () => renderProgram(programItems, programSelect.value, programDetailFilter.value, programSearch.value, programLikedFilter.value);
  programLikedFilter.onchange = () => renderProgram(programItems, programSelect.value, programDetailFilter.value, programSearch.value, programLikedFilter.value);
  programSearch.oninput = () => renderProgram(programItems, programSelect.value, programDetailFilter.value, programSearch.value, programLikedFilter.value);
  programDetailFilter.onchange = () => renderProgram(programItems, programSelect.value, programDetailFilter.value, programSearch.value, programLikedFilter.value);
  programViewFilter.onchange = () => renderProgram(programItems, programSelect.value, programDetailFilter.value, programSearch.value, programLikedFilter.value);
  topicSelect.onchange = () => renderTopics(topicItems, topicSelect.value, topicsSortSelect.value, topicsTypeFilter.value === 'topics-only', topicsDetailFilter.value, topicsSearch.value, topicsLikedFilter.value);
  topicsLikedFilter.onchange = () => renderTopics(topicItems, topicSelect.value, topicsSortSelect.value, topicsTypeFilter.value === 'topics-only', topicsDetailFilter.value, topicsSearch.value, topicsLikedFilter.value);
  topicsSearch.oninput = () => renderTopics(topicItems, topicSelect.value, topicsSortSelect.value, topicsTypeFilter.value === 'topics-only', topicsDetailFilter.value, topicsSearch.value, topicsLikedFilter.value);
  topicsDetailFilter.onchange = () => renderTopics(topicItems, topicSelect.value, topicsSortSelect.value, topicsTypeFilter.value === 'topics-only', topicsDetailFilter.value, topicsSearch.value, topicsLikedFilter.value);
  topicsTypeFilter.onchange = () => renderTopics(topicItems, topicSelect.value, topicsSortSelect.value, topicsTypeFilter.value === 'topics-only', topicsDetailFilter.value, topicsSearch.value, topicsLikedFilter.value);
  topicsSortSelect.onchange = () => renderTopics(topicItems, topicSelect.value, topicsSortSelect.value, topicsTypeFilter.value === 'topics-only', topicsDetailFilter.value, topicsSearch.value, topicsLikedFilter.value);
}
