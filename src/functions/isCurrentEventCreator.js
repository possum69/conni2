function isCurrentEventCreator() {
  if (!currentUserName || !currentEvent) return false;

  const creatorId = currentEvent.creatorId == null ? '' : String(currentEvent.creatorId);
  if (creatorId === currentUserId) return true;
  if (/^\d+$/.test(creatorId)) return false;

  return typeof currentEvent.creatorLogin === 'string'
    && currentEvent.creatorLogin.trim().toLocaleLowerCase() === currentUserKey();
}
