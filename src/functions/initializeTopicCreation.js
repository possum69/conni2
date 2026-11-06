function initializeTopicCreation() {
  const form = document.getElementById('create-topic-form');
  const submitButton = form.querySelector('button[type="submit"]');
  const status = document.getElementById('topic-create-status');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    submitButton.disabled = true;
    status.textContent = '';

    const previousProgramLanguage = document.getElementById('program-language-filter').value;
    const previousProgramLikedBy = document.getElementById('program-liked-filter').value;
    const formData = new FormData(form);
    const splitValues = value => value.split(',').map(part => part.trim()).filter(Boolean);
    const selectedContributors = Array.from(form.querySelectorAll('select[name="contributors"] option:checked'), option => option.value);

    try {
      const response = await fetch(eventApiUrl('/api/topics'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          contributors: selectedContributors,
          languages: splitValues(formData.get('languages'))
        })
      });
      if (!response.ok) throw new Error('Topic creation failed');

      const result = await response.json();
      window.allTopics.push(result.topic);
      populateLanguageFilters(window.allProgramItems || [], window.allTopics);

      const programLanguageFilter = document.getElementById('program-language-filter');
      if (Array.from(programLanguageFilter.options).some(option => option.value === previousProgramLanguage)) {
        programLanguageFilter.value = previousProgramLanguage;
      }
      document.getElementById('program-liked-filter').value = previousProgramLikedBy;
      document.getElementById('topics-language-filter').value = 'all';
      document.getElementById('topics-liked-filter').value = 'all';
      document.getElementById('topics-search-filter').value = '';
      document.getElementById('topics-type-filter').value = 'topics-only';

      form.reset();
      renderCurrentViews();
      status.textContent = translate('topicSaved');
      form.closest('details').open = false;
    } catch {
      status.textContent = translate('topicCreateError');
    } finally {
      submitButton.disabled = false;
    }
  });
}
