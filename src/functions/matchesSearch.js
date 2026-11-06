function matchesSearch(item, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  const searchableText = [item.name, item.desc, ...(item.contributers || [])]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return searchableText.includes(normalizedQuery);
}
