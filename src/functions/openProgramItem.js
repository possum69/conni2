function openProgramItem(programName) {
  const programLanguageFilter = document.getElementById('program-language-filter');
  const programLikedFilter = document.getElementById('program-liked-filter');
  const programSearch = document.getElementById('program-search-filter');
  programLanguageFilter.value = 'all';
  programLikedFilter.value = 'all';
  programSearch.value = '';
  renderProgram(window.allProgramItems || [], 'all', document.getElementById('program-detail-filter').value, '', 'all');

  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === 'program'));
  document.querySelectorAll('.section').forEach(section => {
    section.classList.toggle('active', section.id === 'program-section');
  });

  const target = Array.from(document.querySelectorAll('[data-program-name]'))
    .find(card => card.dataset.programName === programName);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
