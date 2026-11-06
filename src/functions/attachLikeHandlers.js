function attachLikeHandlers(root) {
  root.querySelectorAll('.like-toggle').forEach(button => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      await toggleItemLike(button.dataset.likeType, button.dataset.likeName);
      if (button.isConnected) button.disabled = !currentUserName;
    });
  });
}
