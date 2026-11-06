async function loadData() {
  try {
    const response = await fetch(`/api/event?eventId=${encodeURIComponent(currentEventId)}`);
    if (!response.ok) {
      throw new Error('Could not load event data');
    }

    const data = await response.json();
    currentEvent = data.event;
    window.allProgramItems = data.event.program || [];
    window.allTopics = data.event.topics || [];
    window.allLocations = data.event.locations || [];
    window.eventContributorNames = getEventContributorNames(data.event);
    populateAuthorizedContributorOptions();
    populateLanguageFilters(window.allProgramItems, window.allTopics);
    renderProgram(window.allProgramItems);
    renderTopics(window.allTopics);
    renderLocations(window.allLocations);
  } catch (error) {
    document.getElementById('program-cards').innerHTML = `<p class="loading">${translate('loadError')}</p>`;
    document.getElementById('topics-cards').innerHTML = `<p class="loading">${translate('loadError')}</p>`;
    document.getElementById('locations-cards').innerHTML = `<p class="loading">${translate('loadError')}</p>`;
  }
}
