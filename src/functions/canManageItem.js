function canManageItem(item) {
  if (!currentUserName) return false;

  const userKey = currentUserKey();
  return (item.contributers || []).some(contributor =>
    contributor.trim().toLocaleLowerCase() === userKey
  );
}
