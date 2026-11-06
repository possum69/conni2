function getEventContributorNames(event) {
  const names = new Map();
  const addName = value => {
    if (typeof value !== 'string' || !value.trim()) return;
    const name = value.trim();
    const key = name.toLocaleLowerCase();
    if (!names.has(key)) names.set(key, name);
  };

  addName(event.creatorLogin);
  if (String(event.creatorId || '') === currentUserId || currentUserId === 'local-development') {
    addName(currentUserName);
  }
  (event.authorizedUsers || []).forEach(authorizedUser => {
    addName(typeof authorizedUser === 'string' ? authorizedUser : authorizedUser?.login);
  });
  return Array.from(names.values());
}
