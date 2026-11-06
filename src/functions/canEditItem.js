function canEditItem(item) {
  return isCurrentEventCreator() || canManageItem(item);
}
