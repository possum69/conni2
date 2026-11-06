async function initializeEventFlow() {
  document.getElementById('event-select-form').addEventListener('submit', event => {
    event.preventDefault();
    const chosenEvent = availableEvents.find(candidate =>
      candidate.id === document.getElementById('event-select').value
    );
    if (chosenEvent) activateEvent(chosenEvent);
  });

  document.getElementById('event-select').addEventListener('change', updateEventManagementForm);

  document.getElementById('event-create-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById('event-setup-status');
    submitButton.disabled = true;
    status.textContent = '';
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: new FormData(form).get('name') })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || translate('eventSaveFailed'));
      form.reset();
      await loadEventChoices();
      document.getElementById('event-select').value = result.event.id;
      updateEventManagementForm();
      document.getElementById('event-manage-panel').open = true;
      document.getElementById('event-manage-status').textContent = translate('eventCreatedAddUsers');
    } catch (error) {
      status.textContent = error.message || translate('eventSaveFailed');
    } finally {
      submitButton.disabled = false;
    }
  });

  document.getElementById('event-rename-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.getElementById('event-manage-status');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    status.textContent = '';
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent().id,
          name: new FormData(form).get('name')
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || translate('eventSaveFailed'));
      const managedEvent = selectedEvent();
      managedEvent.name = result.event.name;
      document.getElementById('event-select').selectedOptions[0].textContent = result.event.name;
      document.getElementById('managed-event-name').value = result.event.name;
      status.textContent = translate('eventSaved');
    } catch (error) {
      status.textContent = error.message || translate('eventSaveFailed');
    } finally {
      submitButton.disabled = false;
    }
  });

  document.getElementById('delete-event-button').addEventListener('click', async event => {
    const managedEvent = selectedEvent();
    if (!managedEvent || !window.confirm(translate('deleteEventConfirm', { name: managedEvent.name }))) return;
    const button = event.currentTarget;
    const status = document.getElementById('event-manage-status');
    button.disabled = true;
    status.textContent = '';
    try {
      const response = await fetch('/api/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: managedEvent.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || translate('eventSaveFailed'));
      availableEvents = availableEvents.filter(candidate => candidate.id !== managedEvent.id);
      if (document.getElementById('event-select').value === managedEvent.id) {
        document.getElementById('event-select').selectedIndex = 0;
      }
      try { localStorage.removeItem('conni2-event-id'); } catch {}
      await loadEventChoices();
    } catch (error) {
      status.textContent = error.message || translate('eventSaveFailed');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('authorized-user-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('authorized-user-status');
    button.disabled = true;
    status.textContent = '';
    try {
      const response = await fetch('/api/events/authorized-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent().id,
          login: new FormData(form).get('login')
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || translate('authorizedUserFailed'));
      selectedEvent().authorizedUsers = result.authorizedUsers;
      renderAuthorizedUsers();
      form.reset();
      status.textContent = translate('authorizedUserAdded');
    } catch (error) {
      status.textContent = error.message || translate('authorizedUserFailed');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('logout-button').addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST' });
    window.location.reload();
  });

  document.getElementById('local-login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('local-login-status');
    button.disabled = true;
    status.textContent = '';
    try {
      const response = await fetch('/auth/local-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: new FormData(form).get('name') })
      });
      const result = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(result.error || translate('authLoadFailed'));
      window.location.reload();
    } catch (error) {
      status.textContent = error.message || translate('authLoadFailed');
    } finally {
      button.disabled = false;
    }
  });

  const profileStep = document.getElementById('profile-setup-step');
  const eventStep = document.getElementById('event-setup-step');
  const githubLoginLink = document.getElementById('github-login-link');
  const microsoftLoginLink = document.getElementById('microsoft-login-link');
  const localLoginForm = document.getElementById('local-login-form');
  try {
    const response = await fetch('/api/me');
    if (response.status === 401) {
      profileStep.hidden = false;
      eventStep.hidden = true;
      githubLoginLink.hidden = false;
      microsoftLoginLink.hidden = false;
      localLoginForm.hidden = true;
      return;
    }
    if (!response.ok) throw new Error(translate('authLoadFailed'));
    const result = await response.json();
    currentUserId = result.user.id;
    currentUserName = result.user.login;
    if (result.user.local && !currentUserName) {
      githubLoginLink.hidden = true;
      microsoftLoginLink.hidden = true;
      localLoginForm.hidden = false;
      document.getElementById('local-user-name').focus();
      profileStep.hidden = false;
      eventStep.hidden = true;
      return;
    }
    githubLoginLink.hidden = true;
    microsoftLoginLink.hidden = true;
    localLoginForm.hidden = true;
    document.getElementById('github-user-name').textContent = result.user.local
      ? translate('localDevelopmentUser', { name: currentUserName })
      : result.user.provider === 'microsoft'
        ? currentUserName
        : `@${currentUserName}`;
    document.getElementById('github-user-name').hidden = false;
    document.getElementById('logout-button').textContent = result.user.local
      ? translate('changeLocalName')
      : translate('signOut');
    document.getElementById('logout-button').hidden = false;
    profileStep.hidden = true;
    openEventChooser();
  } catch (error) {
    profileStep.hidden = false;
    eventStep.hidden = true;
    githubLoginLink.hidden = false;
    microsoftLoginLink.hidden = false;
    localLoginForm.hidden = true;
    document.getElementById('event-setup-status').textContent = error.message || translate('authLoadFailed');
  }
}
