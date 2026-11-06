function renderAuthorizedUsers() {
  const event = selectedEvent();
  const list = document.getElementById('authorized-user-list');
  list.replaceChildren();
  (event?.authorizedUsers || []).forEach(user => {
    const login = typeof user === 'string' ? user : user.login;
    const userId = typeof user === 'string' ? '' : user.id;
    const item = document.createElement('li');
    const loginLabel = document.createElement('span');
    loginLabel.textContent = login.includes('@') ? login : `@${login}`;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = translate('removeAuthorizedUser');
    removeButton.addEventListener('click', () => removeAuthorizedUser(userId, login));
    item.append(loginLabel, removeButton);
    list.append(item);
  });
}
