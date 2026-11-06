function renderLikeControl(item, itemType) {
  const state = getItemLikeState(item, itemType);
  const likerNames = state.likers.join(', ') || translate('noLikerNames');
  const tooltip = escapeAttributeValue(translate('likedByTooltip', { names: likerNames }));
  const buttonTitle = currentUserName
    ? translate(state.liked ? 'unlikeTitle' : 'likeTitle')
    : translate('setNameFirst');

  return `
    <div class="like-actions">
      <button
        class="like-toggle"
        type="button"
        data-like-type="${itemType}"
        data-like-name="${escapeAttributeValue(item.name)}"
        aria-pressed="${state.liked}"
        title="${escapeAttributeValue(buttonTitle)}"
        ${currentUserName ? '' : 'disabled'}
      >${translate(state.liked ? 'unlikeAction' : 'likeAction')}</button>
      <p class="likes" title="${tooltip}">♥ ${translate('likesCount', { count: state.likeCount })}</p>
    </div>
  `;
}
