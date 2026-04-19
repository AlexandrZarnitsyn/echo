const authScreen = document.getElementById('authScreen');
const chatScreen = document.getElementById('chatScreen');
const authError = document.getElementById('authError');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authBtn = document.getElementById('authBtn');
const nameGroup = document.getElementById('nameGroup');
const nameInput = document.getElementById('nameInput');
const phoneInput = document.getElementById('phoneInput');
const passwordInput = document.getElementById('passwordInput');
const currentUserText = document.getElementById('currentUserText');
const currentUserAvatar = document.getElementById('currentUserAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const userList = document.getElementById('userList');
const searchInput = document.getElementById('searchInput');
const dialogTitle = document.getElementById('dialogTitle');
const dialogSubtitle = document.getElementById('dialogSubtitle');
const backToDialogsBtn = document.getElementById('backToDialogsBtn');
const emptyState = document.getElementById('emptyState');
const chat = document.getElementById('chat');
const inputArea = document.getElementById('inputArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const profileModal = document.getElementById('profileModal');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileNameInput = document.getElementById('profileNameInput');
const profilePhonePreview = document.getElementById('profilePhonePreview');
const showPhoneToggle = document.getElementById('showPhoneToggle');
const profilePhotoInput = document.getElementById('profilePhotoInput');
const profilePreviewAvatar = document.getElementById('profilePreviewAvatar');
const avatarUploadText = document.getElementById('avatarUploadText');
const blockToggleBtn = document.getElementById('blockToggleBtn');
const renameDialogBtn = document.getElementById('renameDialogBtn');
const chatStatusBanner = document.getElementById('chatStatusBanner');
const settingsTabs = document.querySelectorAll('.settings-tab');
const settingsPanels = document.querySelectorAll('.settings-panel');
const blacklistList = document.getElementById('blacklistList');
const blacklistEmpty = document.getElementById('blacklistEmpty');
const chatScrollControls = document.getElementById('chatScrollControls');
const scrollToTopBtn = document.getElementById('scrollToTopBtn');
const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
const themeSwitcher = document.getElementById('themeSwitcher');
const soundNotificationsToggle = document.getElementById('soundNotificationsToggle');
const silentModeToggle = document.getElementById('silentModeToggle');

const APP_CONFIG = window.APP_CONFIG || {};
const API_BASE_URL = String(APP_CONFIG.API_BASE_URL || '').replace(/\/$/, '');
const SOCKET_URL = String(APP_CONFIG.SOCKET_URL || API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  if (!path.startsWith('/')) return `${API_BASE_URL}/${path}`;
  return `${API_BASE_URL}${path}`;
}


let mode = 'register';
let currentUser = null;
let currentDialogUser = null;
let users = [];
let onlineUserIds = new Set();
let socket = null;
let blacklistUsers = [];
let editingMessageId = null;
let currentDialogState = {
  canMessage: true,
  isBlocked: false,
  blockedByUser: false
};
let shouldStickToBottom = true;
let notificationAudioContext = null;


const DIALOG_ALIASES_KEY = (userId) => `messengerAliases:${userId}`;
const THEME_STORAGE_KEY = 'messengerTheme';

function applyTheme(theme = 'dark') {
  const normalizedTheme = theme === 'light' ? 'light' : 'dark';
  document.body.dataset.theme = normalizedTheme;
  localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);

  if (themeSwitcher) {
    themeSwitcher.querySelectorAll('.theme-option').forEach((button) => {
      button.classList.toggle('active', button.dataset.themeValue === normalizedTheme);
    });
  }
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  applyTheme(savedTheme);
}

function getDialogAliases() {
  if (!currentUser?.id) return {};
  try {
    return JSON.parse(localStorage.getItem(DIALOG_ALIASES_KEY(currentUser.id)) || '{}');
  } catch {
    return {};
  }
}

function getDisplayName(user) {
  if (!user) return '';
  const aliases = getDialogAliases();
  return aliases[user.id] || user.name || user.phone || 'Без имени';
}

function getUserNickname(user) {
  const displayName = getDisplayName(user);
  const base = String(displayName).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-я0-9_]+/gi, '');
  return `@${base || 'user'}`;
}

function shouldMuteNotifications() {
  return currentUser?.silentMode === true;
}

function shouldPlayNotificationSound() {
  return !shouldMuteNotifications() && currentUser?.soundEnabled !== false;
}

async function ensureNotificationPermission() {
  if (!("Notification" in window)) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission || 'default';
  }
}

function playNotificationSound() {
  if (!shouldPlayNotificationSound()) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!notificationAudioContext) notificationAudioContext = new AudioCtx();
    const ctx = notificationAudioContext;
    if (ctx.state === 'suspended') ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.24);
  } catch {}
}

async function showIncomingNotification(message) {
  if (shouldMuteNotifications() || !message || message.senderId === currentUser?.id) return;
  const permission = await ensureNotificationPermission();
  if (permission !== 'granted') return;
  if (!document.hidden && document.hasFocus()) return;
  const title = message.senderName || 'Новое сообщение';
  const body = message.deletedAt ? 'Сообщение удалено' : message.text;
  const notification = new Notification(title, { body, icon: DEFAULT_AVATAR, tag: `dialog:${message.dialogId}` });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

function handleIncomingMessageEffects(message, isCurrentDialog) {
  if (!currentUser || message.senderId === currentUser.id) return;
  if (isCurrentDialog && document.hasFocus() && !document.hidden) return;
  playNotificationSound();
  showIncomingNotification(message);
}

function saveDialogAlias(otherUserId, alias) {
  if (!currentUser?.id || !otherUserId) return;
  const aliases = getDialogAliases();
  if (alias) aliases[otherUserId] = alias;
  else delete aliases[otherUserId];
  localStorage.setItem(DIALOG_ALIASES_KEY(currentUser.id), JSON.stringify(aliases));
}

const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <rect width="100%" height="100%" rx="40" fill="#dbeafe"/>
  <circle cx="40" cy="29" r="14" fill="#60a5fa"/>
  <path d="M17 67c5-13 15-20 23-20s18 7 23 20" fill="#60a5fa"/>
</svg>
`);

function showScreen(screen) {
  authScreen.classList.remove('active');
  chatScreen.classList.remove('active');
  screen.classList.add('active');
}

function switchMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === nextMode);
  });

  const isRegister = nextMode === 'register';
  nameGroup.style.display = isRegister ? 'block' : 'none';
  authTitle.textContent = isRegister ? 'Создать аккаунт' : 'Войти в аккаунт';
  authSubtitle.textContent = isRegister
    ? 'Зарегистрируйтесь по номеру телефона'
    : 'Введите номер телефона и пароль';
  authBtn.textContent = isRegister ? 'Зарегистрироваться' : 'Войти';
  authError.textContent = '';
}

function getTime(dateString) {
  return new Date(dateString).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function normalizePhone(phone = '') {
  return String(phone).replace(/[^\d+]/g, '');
}

function resolveAssetUrl(value = '') {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/${value}`;
}

function getAvatar(user) {
  return (user && user.photo) ? resolveAssetUrl(user.photo) : DEFAULT_AVATAR;
}

function formatPhoneForDisplay(phone = '') {
  return phone || 'Номер скрыт';
}

function formatPreview(user) {
  if (user.isBlocked) return 'Пользователь в черном списке';
  if (user.blockedByUser) return 'Пользователь ограничил переписку';
  if (!user.lastMessage) return 'Нажмите, чтобы начать диалог';
  const prefix = user.lastMessage.senderId === currentUser.id ? 'Вы: ' : '';
  const messageText = user.lastMessage.deletedAt ? 'Сообщение удалено' : user.lastMessage.text;
  return `${prefix}${messageText}`;
}

function renderCurrentUser() {
  currentUserText.textContent = `${currentUser.name} · ${formatPhoneForDisplay(currentUser.phone)}`;
  currentUserAvatar.src = getAvatar(currentUser);
}

function renderUsers() {
  userList.innerHTML = '';

  if (!users.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-users';
    empty.textContent = searchInput.value.trim() ? 'Пользователи не найдены.' : 'Диалогов пока нет. Найдите собеседника по номеру телефона.';
    userList.appendChild(empty);
    return;
  }

  users.forEach((user) => {
    const card = document.createElement('div');
    card.className = `user-card ${currentDialogUser?.id === user.id ? 'active' : ''}`;
    card.addEventListener('click', () => selectDialog(user.id));

    const unreadBadge = user.unreadCount > 0
      ? `<div class="unread-badge" title="Новые непрочитанные сообщения">${user.unreadCount > 99 ? '99+' : user.unreadCount}</div>`
      : '';

    card.innerHTML = `
      <div class="user-main">
        <div class="avatar-wrap">
          <img class="profile-avatar" src="${getAvatar(user)}" alt="avatar" />
          ${unreadBadge}
        </div>
        <div class="user-main-content">
          <div class="user-top">
            <div class="user-name-line">
              <div>
                <div class="user-name">${getDisplayName(user)}</div>
                <div class="user-nick">${getUserNickname(user)}</div>
              </div>
            </div>
            <div class="presence ${onlineUserIds.has(user.id) ? 'online' : ''}"></div>
          </div>
          <div class="user-preview">${formatPreview(user)}</div>
        </div>
      </div>
    `;

    userList.appendChild(card);
  });
}

function showDialogUI(hasDialog) {
  emptyState.classList.toggle('hidden', hasDialog);
  chat.classList.toggle('hidden', !hasDialog);
  inputArea.classList.toggle('hidden', !hasDialog);
  chatScrollControls.classList.toggle('hidden', !hasDialog);
  updateChatScrollControls();
}

function isNearBottom() {
  const threshold = 80;
  return chat.scrollHeight - chat.scrollTop - chat.clientHeight <= threshold;
}

function scrollChatToBottom(force = false) {
  window.requestAnimationFrame(() => {
    if (force || shouldStickToBottom || isNearBottom()) {
      chat.scrollTo({ top: chat.scrollHeight, behavior: force ? 'auto' : 'smooth' });
      shouldStickToBottom = true;
    }
    updateChatScrollControls();
  });
}

function updateChatScrollControls() {
  if (chat.classList.contains('hidden')) return;
  const hasOverflow = chat.scrollHeight > chat.clientHeight + 20;
  chatScrollControls.classList.toggle('hidden', !hasOverflow);
  if (!hasOverflow) return;

  const atTop = chat.scrollTop <= 20;
  const atBottom = isNearBottom();
  scrollToTopBtn.disabled = atTop;
  scrollToBottomBtn.disabled = atBottom;
  scrollToTopBtn.style.opacity = atTop ? '0.45' : '1';
  scrollToBottomBtn.style.opacity = atBottom ? '0.45' : '1';
}

function getStatusDots(message) {
  if (!currentUser || message.senderId !== currentUser.id) return '';
  if (message.readAt) {
    return `<span class="status-dots" title="Прочитано">
      <span class="status-dot"></span><span class="status-dot"></span>
    </span>`;
  }
  if (message.deliveredAt) {
    return `<span class="status-dots" title="Доставлено">
      <span class="status-dot"></span>
    </span>`;
  }
  return '';
}

function createMessageNode(message) {
  const node = document.createElement('div');
  const isMe = currentUser && message.senderId === currentUser.id;
  node.className = `message ${isMe ? 'me' : 'other'} ${message.deletedAt ? 'deleted' : ''}`;
  node.dataset.id = message.id;

  const sender = document.createElement('div');
  sender.className = 'sender';
  sender.textContent = isMe ? 'Вы' : message.senderName;

  const content = document.createElement('div');
  content.className = 'message-text';
  content.textContent = message.deletedAt ? 'Сообщение удалено' : message.text;

  const meta = document.createElement('div');
  meta.className = 'meta';
  const editedMark = message.editedAt && !message.deletedAt ? '<span class="edited-mark">ред.</span>' : '';
  meta.innerHTML = `<span>${getTime(message.createdAt)}</span>${editedMark}${getStatusDots(message)}`;

  node.appendChild(sender);
  node.appendChild(content);

  if (isMe && !message.deletedAt) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    actions.innerHTML = `
      <button class="message-action-btn edit" data-action="edit" type="button" title="Редактировать" aria-label="Редактировать сообщение">
        <span class="message-action-icon">✎</span><span>Изменить</span>
      </button>
      <button class="message-action-btn danger" data-action="delete" type="button" title="Удалить" aria-label="Удалить сообщение">
        <span class="message-action-icon">🗑</span><span>Удалить</span>
      </button>
    `;
    node.appendChild(actions);
  }

  node.appendChild(meta);
  return node;
}

function addMessage(message) {
  chat.appendChild(createMessageNode(message));
  scrollChatToBottom();
}

function upsertMessage(message) {
  const existing = chat.querySelector(`.message[data-id="${message.id}"]`);
  const replacement = createMessageNode(message);
  if (existing) existing.replaceWith(replacement);
  else chat.appendChild(replacement);
  scrollChatToBottom();
}

function refreshMessageStatus(messageId, deliveredAt, readAt) {
  const node = chat.querySelector(`.message[data-id="${messageId}"]`);
  if (!node) return;
  const meta = node.querySelector('.meta');
  if (!meta) return;

  const timeText = meta.querySelector('span')?.textContent || '';
  const editedMark = meta.querySelector('.edited-mark') ? '<span class="edited-mark">ред.</span>' : '';
  meta.innerHTML = `<span>${timeText}</span>${editedMark}${
    readAt ? `<span class="status-dots" title="Прочитано"><span class="status-dot"></span><span class="status-dot"></span></span>`
    : deliveredAt ? `<span class="status-dots" title="Доставлено"><span class="status-dot"></span></span>`
    : ''
  }`;
}

function syncCurrentUserFromList(sourceUser) {
  if (!sourceUser || !currentUser) return;
  if (sourceUser.id === currentUser.id && sourceUser.blockedUserIds) {
    currentUser.blockedUserIds = sourceUser.blockedUserIds;
    localStorage.setItem('messengerCurrentUser', JSON.stringify(currentUser));
  }
}

function applyDialogRestrictions() {
  if (!currentDialogUser) {
    blockToggleBtn.classList.add('hidden');
    chatStatusBanner.classList.add('hidden');
    chatStatusBanner.textContent = '';
    inputArea.classList.remove('disabled');
    messageInput.disabled = false;
    sendBtn.disabled = false;
    return;
  }

  blockToggleBtn.classList.remove('hidden');
  blockToggleBtn.textContent = currentDialogState.isBlocked ? 'Убрать из черного списка' : 'В черный список';

  let bannerText = '';
  if (currentDialogState.isBlocked) {
    bannerText = 'Вы заблокировали этого собеседника. Отправка сообщений отключена.';
  } else if (currentDialogState.blockedByUser) {
    bannerText = 'Собеседник скрыл общение. Отправка сообщений недоступна.';
  }

  chatStatusBanner.textContent = bannerText;
  chatStatusBanner.classList.toggle('hidden', !bannerText);

  inputArea.classList.toggle('disabled', !currentDialogState.canMessage);
  messageInput.disabled = !currentDialogState.canMessage;
  sendBtn.disabled = !currentDialogState.canMessage;
  if (!editingMessageId) {
    messageInput.placeholder = currentDialogState.canMessage ? 'Введите сообщение...' : 'Отправка сообщений недоступна';
  }
}

async function loadUsers() {
  const search = searchInput.value.trim();
  const response = await fetch(
    apiUrl(`/api/users?currentUserId=${encodeURIComponent(currentUser.id)}&search=${encodeURIComponent(search)}`)
  );
  const data = await response.json();
  users = data.users || [];

  if (currentDialogUser) {
    const foundCurrent = users.find((user) => user.id === currentDialogUser.id);
    if (foundCurrent) {
      currentDialogUser = foundCurrent;
      currentDialogState = {
        canMessage: foundCurrent.canMessage !== false,
        isBlocked: Boolean(foundCurrent.isBlocked),
        blockedByUser: Boolean(foundCurrent.blockedByUser)
      };
    } else if (search) {
      exitDialog();
    }
  }

  renderUsers();
  updateDialogHeader();
  applyDialogRestrictions();

  if (currentDialogUser) {
    showDialogUI(true);
  } else {
    showDialogUI(false);
  }
}

async function loadPresence() {
  const response = await fetch(apiUrl('/api/presence'));
  const data = await response.json();
  onlineUserIds = new Set(data.onlineUserIds || []);
  renderUsers();
}

function updateDialogHeader() {
  if (!currentDialogUser) {
    dialogTitle.textContent = 'Выберите собеседника';
    dialogSubtitle.textContent = 'Личные сообщения в реальном времени';
    backToDialogsBtn.classList.add('hidden');
    renameDialogBtn.classList.add('hidden');
    return;
  }

  dialogTitle.textContent = getDisplayName(currentDialogUser);
  renameDialogBtn.classList.remove('hidden');
  const phoneText = currentDialogUser.phone ? currentDialogUser.phone : 'Номер скрыт';
  dialogSubtitle.textContent = onlineUserIds.has(currentDialogUser.id)
    ? `${phoneText} · онлайн`
    : phoneText;
  backToDialogsBtn.classList.remove('hidden');
}

async function selectDialog(userId) {
  const selected = users.find((user) => user.id === userId);
  if (!selected) return;

  currentDialogUser = selected;
  currentDialogState = {
    canMessage: selected.canMessage !== false,
    isBlocked: Boolean(selected.isBlocked),
    blockedByUser: Boolean(selected.blockedByUser)
  };
  updateDialogHeader();
  renderUsers();
  showDialogUI(true);
  applyDialogRestrictions();
  resetEditingState();

  const response = await fetch(apiUrl(`/api/messages/${userId}?currentUserId=${encodeURIComponent(currentUser.id)}`));
  const data = await response.json();

  currentDialogState = {
    canMessage: data.canMessage !== false,
    isBlocked: Boolean(data.isBlocked),
    blockedByUser: Boolean(data.blockedByUser)
  };

  chat.innerHTML = '';
  shouldStickToBottom = true;
  (data.messages || []).forEach((message) => {
    chat.appendChild(createMessageNode(message));
  });
  scrollChatToBottom(true);
  applyDialogRestrictions();
  renderUsers();
  updateDialogHeader();

  if (socket) {
    socket.emit('open-dialog', { currentUserId: currentUser.id, otherUserId: userId });
  }

  await loadUsers();
}

function exitDialog() {
  currentDialogUser = null;
  currentDialogState = {
    canMessage: true,
    isBlocked: false,
    blockedByUser: false
  };
  chat.innerHTML = '';
  shouldStickToBottom = true;
  resetEditingState();
  updateDialogHeader();
  applyDialogRestrictions();
  renderUsers();
  showDialogUI(false);
}

function setupSocket() {
  socket = io(SOCKET_URL || undefined, SOCKET_URL ? { transports: ['websocket', 'polling'] } : undefined);

  socket.on('connect', () => {
    socket.emit('join-user', currentUser);
  });

  socket.on('presence:update', ({ userId, isOnline }) => {
    if (isOnline) onlineUserIds.add(userId);
    else onlineUserIds.delete(userId);
    renderUsers();
    updateDialogHeader();
  });

  socket.on('private-message', async (message) => {
    const isCurrentDialog = Boolean(currentDialogUser && message.dialogId === [currentUser.id, currentDialogUser.id].sort().join(':'));
    if (isCurrentDialog) {
      addMessage(message);
      socket.emit('open-dialog', { currentUserId: currentUser.id, otherUserId: currentDialogUser.id });
    }
    handleIncomingMessageEffects(message, isCurrentDialog);
    await loadUsers();
  });

  socket.on('message:status-update', ({ id, deliveredAt, readAt }) => {
    refreshMessageStatus(id, deliveredAt, readAt);
    loadUsers();
  });

  socket.on('message:updated', async (message) => {
    upsertMessage(message);
    await loadUsers();
    if (editingMessageId === message.id && message.deletedAt) resetEditingState();
  });

  socket.on('message:deleted', async (message) => {
    upsertMessage(message);
    await loadUsers();
    if (editingMessageId === message.id) resetEditingState();
  });

  socket.on('user:updated', async (user) => {
    if (!user) return;

    if (currentUser?.id === user.id) {
      currentUser = { ...currentUser, ...user };
      syncCurrentUserFromList(user);
      localStorage.setItem('messengerCurrentUser', JSON.stringify(currentUser));
      renderCurrentUser();
    }

    users = users.map((item) => item.id === user.id ? { ...item, ...user } : item);

    if (currentDialogUser?.id === user.id) {
      currentDialogUser = { ...currentDialogUser, ...user };
      updateDialogHeader();
      applyDialogRestrictions();
    }

    renderUsers();
    await loadUsers();
    if (!profileModal.classList.contains('hidden')) {
      await loadBlacklist();
    }
  });
}

async function submitAuth() {
  const payload = {
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    password: passwordInput.value.trim()
  };

  authError.textContent = '';

  try {
    const response = await fetch(apiUrl(mode === 'register' ? '/api/register' : '/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      authError.textContent = data.error || 'Ошибка авторизации';
      return;
    }

    currentUser = data.user;
    localStorage.setItem('messengerCurrentUser', JSON.stringify(currentUser));
    renderCurrentUser();
    showScreen(chatScreen);
    if (socket) socket.disconnect();
    setupSocket();
    await loadPresence();
    await loadUsers();
  } catch {
    authError.textContent = 'Сервер недоступен';
  }
}

function logout() {
  localStorage.removeItem('messengerCurrentUser');
  currentUser = null;
  currentDialogUser = null;
  users = [];
  chat.innerHTML = '';
  shouldStickToBottom = true;
  resetEditingState();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  closeProfileModal();
  showDialogUI(false);
  showScreen(authScreen);
}

async function submitMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentDialogUser) return;

  if (editingMessageId) {
    try {
      const response = await fetch(apiUrl(`/api/messages/${editingMessageId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: currentUser.id, text })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось обновить сообщение');
      upsertMessage(data.message);
      resetEditingState();
      await loadUsers();
    } catch (error) {
      alert(error.message || 'Не удалось обновить сообщение');
    }
    return;
  }

  if (!socket || !currentDialogState.canMessage) return;
  socket.emit('send-private-message', { text, recipientId: currentDialogUser.id });
  messageInput.value = '';
  messageInput.focus();
}

async function deleteMessage(messageId) {
  try {
    const response = await fetch(apiUrl(`/api/messages/${messageId}?currentUserId=${encodeURIComponent(currentUser.id)}`), {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Не удалось удалить сообщение');
    upsertMessage(data.message);
    if (editingMessageId === messageId) resetEditingState();
    await loadUsers();
  } catch (error) {
    alert(error.message || 'Не удалось удалить сообщение');
  }
}

function startEditingMessage(messageId) {
  const node = chat.querySelector(`.message[data-id="${messageId}"] .message-text`);
  if (!node) return;
  editingMessageId = messageId;
  messageInput.value = node.textContent;
  messageInput.placeholder = 'Измените сообщение';
  messageInput.focus();
  sendBtn.textContent = 'Сохранить';
}

function resetEditingState() {
  editingMessageId = null;
  messageInput.value = '';
  if (!editingMessageId) {
    messageInput.placeholder = currentDialogState.canMessage ? 'Введите сообщение...' : 'Отправка сообщений недоступна';
  }
  sendBtn.textContent = 'Отправить';
}

function switchSettingsTab(tabName = 'account') {
  settingsTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
  settingsPanels.forEach((panel) => panel.classList.toggle('hidden', panel.dataset.panel !== tabName));
}

async function loadBlacklist() {
  if (!currentUser) return;
  const response = await fetch(apiUrl(`/api/blacklist?currentUserId=${encodeURIComponent(currentUser.id)}`));
  const data = await response.json();
  blacklistUsers = data.users || [];
  renderBlacklist();
}

function renderBlacklist() {
  blacklistList.innerHTML = '';
  blacklistEmpty.classList.toggle('hidden', blacklistUsers.length > 0);

  blacklistUsers.forEach((user) => {
    const item = document.createElement('div');
    item.className = 'blacklist-item';
    item.innerHTML = `
      <div class="blacklist-user">
        <img class="profile-avatar" src="${getAvatar(user)}" alt="avatar" />
        <div>
          <div class="blacklist-name">${getDisplayName(user)}</div>
          <div class="blacklist-subtitle">${user.phone || 'Номер скрыт'}</div>
        </div>
      </div>
      <button class="ghost-btn danger-btn blacklist-remove-btn" data-id="${user.id}" type="button">Убрать</button>
    `;
    blacklistList.appendChild(item);
  });
}

function renameCurrentDialogUser() {
  if (!currentDialogUser) return;
  const currentAlias = getDisplayName(currentDialogUser);
  const alias = window.prompt('Введите имя для этого собеседника. Пустое значение вернет исходное имя.', currentAlias === currentDialogUser.name ? '' : currentAlias);
  if (alias === null) return;
  const trimmed = alias.trim();
  saveDialogAlias(currentDialogUser.id, trimmed);
  renderUsers();
  updateDialogHeader();
  if (!profileModal.classList.contains('hidden')) renderBlacklist();
}

function openProfileModal() {
  profileNameInput.value = currentUser?.name || '';
  profilePhonePreview.textContent = currentUser?.phone || '';
  showPhoneToggle.checked = currentUser?.showPhone !== false;
  soundNotificationsToggle.checked = currentUser?.soundEnabled !== false;
  silentModeToggle.checked = currentUser?.silentMode === true;
  profilePreviewAvatar.src = getAvatar(currentUser);
  profilePhotoInput.value = '';
  avatarUploadText.textContent = 'Выбрать аватарку';
  switchSettingsTab('account');
  profileModal.classList.remove('hidden');
  loadBlacklist();
}

function closeProfileModal() {
  profileModal.classList.add('hidden');
}

async function saveProfile() {
  const newName = profileNameInput.value.trim();
  if (!newName || newName.length < 2) {
    alert('Имя должно содержать минимум 2 символа');
    return;
  }

  try {
    const nameResponse = await fetch(apiUrl('/api/profile'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        name: newName,
        showPhone: showPhoneToggle.checked,
        soundEnabled: soundNotificationsToggle.checked,
        silentMode: silentModeToggle.checked
      })
    });
    const nameData = await nameResponse.json();
    if (!nameResponse.ok) throw new Error(nameData.error || 'Не удалось обновить профиль');

    currentUser = nameData.user;
    localStorage.setItem('messengerCurrentUser', JSON.stringify(currentUser));
    renderCurrentUser();

    if (profilePhotoInput.files[0]) {
      const formData = new FormData();
      formData.append('userId', currentUser.id);
      formData.append('photo', profilePhotoInput.files[0]);

      const photoResponse = await fetch(apiUrl('/api/profile/photo'), {
        method: 'POST',
        body: formData
      });
      const photoData = await photoResponse.json();
      if (!photoResponse.ok) throw new Error(photoData.error || 'Не удалось обновить фото');

      currentUser = { ...currentUser, ...photoData.user };
      localStorage.setItem('messengerCurrentUser', JSON.stringify(currentUser));
      renderCurrentUser();
    }

    closeProfileModal();
    await loadUsers();
  } catch (error) {
    alert(error.message || 'Не удалось сохранить профиль');
  }
}

async function toggleBlockUser() {
  if (!currentDialogUser) return;

  const method = currentDialogState.isBlocked ? 'DELETE' : 'POST';
  const response = await fetch(apiUrl(`/api/block/${currentDialogUser.id}${method === 'DELETE' ? `?currentUserId=${encodeURIComponent(currentUser.id)}` : ''}`), {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: method === 'POST' ? JSON.stringify({ currentUserId: currentUser.id }) : undefined
  });

  const data = await response.json();
  if (!response.ok) {
    alert(data.error || 'Не удалось изменить черный список');
    return;
  }

  currentUser = { ...currentUser, ...data.user };
  localStorage.setItem('messengerCurrentUser', JSON.stringify(currentUser));
  renderCurrentUser();
  await loadUsers();
  await loadBlacklist();
}

async function removeFromBlacklist(userId) {
  const response = await fetch(apiUrl(`/api/block/${userId}?currentUserId=${encodeURIComponent(currentUser.id)}`), {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || 'Не удалось убрать пользователя из черного списка');
    return;
  }
  currentUser = { ...currentUser, ...data.user };
  localStorage.setItem('messengerCurrentUser', JSON.stringify(currentUser));
  renderCurrentUser();
  await loadUsers();
  await loadBlacklist();
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => switchMode(tab.dataset.tab));
});

authBtn.addEventListener('click', submitAuth);
passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') submitAuth();
});
searchInput.addEventListener('input', loadUsers);
sendBtn.addEventListener('click', submitMessage);
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') submitMessage();
});
currentUserAvatar.addEventListener('click', openProfileModal);
closeProfileBtn.addEventListener('click', closeProfileModal);
saveProfileBtn.addEventListener('click', saveProfile);
logoutBtn.addEventListener('click', logout);
backToDialogsBtn.addEventListener('click', exitDialog);
blockToggleBtn.addEventListener('click', toggleBlockUser);
renameDialogBtn.addEventListener('click', renameCurrentDialogUser);
profilePhotoInput.addEventListener('change', () => {
  const file = profilePhotoInput.files[0];
  avatarUploadText.textContent = file ? file.name : 'Выбрать аватарку';
  if (file) {
    profilePreviewAvatar.src = URL.createObjectURL(file);
  }
});

settingsTabs.forEach((tab) => {
  tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab));
});

if (themeSwitcher) {
  themeSwitcher.addEventListener('click', (event) => {
    const button = event.target.closest('.theme-option');
    if (!button) return;
    applyTheme(button.dataset.themeValue);
  });
}

if (silentModeToggle) {
  silentModeToggle.addEventListener('change', () => {
    if (silentModeToggle.checked) {
      soundNotificationsToggle.checked = false;
    }
  });
}

if (soundNotificationsToggle) {
  soundNotificationsToggle.addEventListener('change', async () => {
    if (soundNotificationsToggle.checked) {
      silentModeToggle.checked = false;
      await ensureNotificationPermission();
    }
  });
}

blacklistList.addEventListener('click', (event) => {
  const btn = event.target.closest('.blacklist-remove-btn');
  if (!btn) return;
  removeFromBlacklist(btn.dataset.id);
});

chat.addEventListener('scroll', () => {
  shouldStickToBottom = isNearBottom();
  updateChatScrollControls();
});

chat.addEventListener('click', (event) => {
  const button = event.target.closest('.message-action-btn');
  if (!button) return;
  const messageNode = button.closest('.message');
  if (!messageNode) return;
  const action = button.dataset.action;
  if (action === 'edit') startEditingMessage(messageNode.dataset.id);
  if (action === 'delete') deleteMessage(messageNode.dataset.id);
});

scrollToTopBtn.addEventListener('click', () => {
  chat.scrollTo({ top: 0, behavior: 'smooth' });
});

scrollToBottomBtn.addEventListener('click', () => {
  shouldStickToBottom = true;
  scrollChatToBottom();
});

profileModal.addEventListener('click', (event) => {
  if (event.target === profileModal) closeProfileModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!profileModal.classList.contains('hidden')) {
    closeProfileModal();
    return;
  }
  if (currentDialogUser) {
    exitDialog();
  }
});

window.addEventListener('resize', () => {
  updateChatScrollControls();
  if (shouldStickToBottom && !chat.classList.contains('hidden')) {
    scrollChatToBottom(true);
  }
});

window.addEventListener('load', async () => {
  loadSavedTheme();
  const savedUser = localStorage.getItem('messengerCurrentUser');
  if (!savedUser) return;

  try {
    currentUser = { soundEnabled: true, silentMode: false, ...JSON.parse(savedUser) };
    renderCurrentUser();
    showScreen(chatScreen);
    setupSocket();
    await loadPresence();
    await loadUsers();
  } catch {
    localStorage.removeItem('messengerCurrentUser');
  }
});

loadSavedTheme();
