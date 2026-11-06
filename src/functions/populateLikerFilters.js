function populateLikerFilters() {
  const personalizedOptionState = currentUserName ? '' : 'disabled';
  const likerOptions = [
    `<option value="my-likes-and-contribution" ${personalizedOptionState}>${translate('myLikesAndContribution')}</option>`,
    `<option value="my-likes" ${personalizedOptionState}>${translate('myLikes')}</option>`,
    `<option value="my-contribution" ${personalizedOptionState}>${translate('myContribution')}</option>`,
    `<option value="all">${translate('all')}</option>`
  ]
    .join('');

  const programLikedFilter = document.getElementById('program-liked-filter');
  const topicsLikedFilter = document.getElementById('topics-liked-filter');
  const selectedProgramFilter = programLikedFilter.value;
  const selectedTopicsFilter = topicsLikedFilter.value;
  programLikedFilter.innerHTML = likerOptions;
  topicsLikedFilter.innerHTML = likerOptions;
  programLikedFilter.value = Array.from(programLikedFilter.options)
    .some(option => option.value === selectedProgramFilter && !option.disabled)
    ? selectedProgramFilter
    : 'all';
  topicsLikedFilter.value = Array.from(topicsLikedFilter.options)
    .some(option => option.value === selectedTopicsFilter && !option.disabled)
    ? selectedTopicsFilter
    : 'all';
}
