function eventApiUrl(path) {
  return `${path}?eventId=${encodeURIComponent(currentEventId)}`;
}
