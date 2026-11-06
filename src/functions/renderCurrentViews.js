function renderCurrentViews() {
  if (!window.allProgramItems) return;

  renderProgram(
    window.allProgramItems,
    document.getElementById('program-language-filter').value,
    document.getElementById('program-detail-filter').value,
    document.getElementById('program-search-filter').value,
    document.getElementById('program-liked-filter').value
  );
  renderTopics(
    window.allTopics || [],
    document.getElementById('topics-language-filter').value,
    document.getElementById('topics-sort-select').value,
    document.getElementById('topics-type-filter').value === 'topics-only',
    document.getElementById('topics-detail-filter').value,
    document.getElementById('topics-search-filter').value,
    document.getElementById('topics-liked-filter').value
  );
}
