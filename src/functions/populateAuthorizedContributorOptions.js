function populateAuthorizedContributorOptions() {
  const select = document.getElementById('new-topic-contributors');
  select.replaceChildren(...(window.eventContributorNames || []).map(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    return option;
  }));
}
