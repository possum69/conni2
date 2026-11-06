function getItemLikeState(item, itemType) {
  const nameKey = currentUserKey();
  const likers = item.likers || [];
  const likeCount = Number(item.likeCount);
  const liked = !!nameKey && likers.some(liker => liker.toLocaleLowerCase() === nameKey);
  return { liked, likeCount: Number.isFinite(likeCount) ? likeCount : likers.length, likers };
}
