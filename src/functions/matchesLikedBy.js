function matchesLikedBy(item, likedBy, itemType) {
  if (likedBy === 'all') return true;
  if (!currentUserName) return false;

  const userKey = currentUserKey();
  const liked = getItemLikeState(item, itemType).liked;
  if (likedBy === 'my-likes') return liked;

  const contributed = (item.contributers || []).some(contributor =>
    contributor.trim().toLocaleLowerCase() === userKey
  );
  if (likedBy === 'my-contribution') return contributed;
  return likedBy === 'my-likes-and-contribution' && (liked || contributed);
}
