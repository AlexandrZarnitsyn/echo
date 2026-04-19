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
const createGroupBtn = document.getElementById('createGroupBtn');
const userList = document.getElementById('userList');
const searchInput = document.getElementById('searchInput');
const dialogTitle = document.getElementById('dialogTitle');
const dialogSubtitle = document.getElementById('dialogSubtitle');
const backToDialogsBtn = document.getElementById('backToDialogsBtn');
const emptyState = document.getElementById('emptyState');
const chat = document.getElementById('chat');
const chatPanel = document.querySelector('.chat-panel');
const inputArea = document.getElementById('inputArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messageAttachBtn = document.getElementById('messageAttachBtn');
const messageAttachmentInput = document.getElementById('messageAttachmentInput');
const messageAttachmentPreview = document.getElementById('messageAttachmentPreview');
const messageAttachmentName = document.getElementById('messageAttachmentName');
const clearMessageAttachmentBtn = document.getElementById('clearMessageAttachmentBtn');
const messageAttachmentPreviewMedia = document.getElementById('messageAttachmentPreviewMedia');
const attachmentModal = document.getElementById('attachmentModal');
const attachmentModalTitle = document.getElementById('attachmentModalTitle');
const attachmentModalPreview = document.getElementById('attachmentModalPreview');
const attachmentModalCloseBtn = document.getElementById('attachmentModalCloseBtn');
const attachmentCaptionInput = document.getElementById('attachmentCaptionInput');
const attachmentChooseAnotherBtn = document.getElementById('attachmentChooseAnotherBtn');
const attachmentCancelBtn = document.getElementById('attachmentCancelBtn');
const attachmentSendBtn = document.getElementById('attachmentSendBtn');
const mediaViewerModal = document.getElementById('mediaViewerModal');
const mediaViewerContent = document.getElementById('mediaViewerContent');
const mediaViewerCloseBtn = document.getElementById('mediaViewerCloseBtn');
const mediaViewerPrevBtn = document.getElementById('mediaViewerPrevBtn');
const mediaViewerNextBtn = document.getElementById('mediaViewerNextBtn');
const composerDropHint = document.getElementById('composerDropHint');
const profileModal = document.getElementById('profileModal');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileNameInput = document.getElementById('profileNameInput');
const profilePhonePreview = document.getElementById('profilePhonePreview');
const showPhoneToggle = document.getElementById('showPhoneToggle');
const soundToggle = document.getElementById('soundToggle');
const soundToggleWrap = document.getElementById('soundToggleWrap');
const silentModeToggle = document.getElementById('silentModeToggle');
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
const groupModal = document.getElementById('groupModal');
const groupTitleInput = document.getElementById('groupTitleInput');
const groupMembersList = document.getElementById('groupMembersList');
const closeGroupBtn = document.getElementById('closeGroupBtn');
const saveGroupBtn = document.getElementById('saveGroupBtn');

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
let directUsers = [];
let conversations = [];
let users = [];
let contacts = [];
let currentMessages = [];
let onlineUserIds = new Set();
let socket = null;
let blacklistUsers = [];
let editingMessageId = null;
let notificationPrefs = { soundEnabled: true, silentMode: false };
let audioContextRef = null;
let currentDialogState = {
  canMessage: true,
  isBlocked: false,
  blockedByUser: false
};
let shouldStickToBottom = true;
let pendingAttachments = [];
let isUploadingAttachment = false;
let mediaViewerItems = [];
let mediaViewerIndex = 0;


const DIALOG_ALIASES_KEY = (userId) => `messengerAliases:${userId}`;
const THEME_STORAGE_KEY = 'messengerTheme';
const NOTIFICATION_PREFS_KEY = 'messengerNotificationPrefs';

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
  return aliases[user.id] || user.name;
}

function saveDialogAlias(otherUserId, alias) {
  if (!currentUser?.id || !otherUserId) return;
  const aliases = getDialogAliases();
  if (alias) aliases[otherUserId] = alias;
  else delete aliases[otherUserId];
  localStorage.setItem(DIALOG_ALIASES_KEY(currentUser.id), JSON.stringify(aliases));
}

function isGroupItem(item) {
  return Boolean(item?.isGroup || item?.type === 'group');
}

function getItemId(item) {
  return `${isGroupItem(item) ? 'group' : 'user'}:${item?.id || ''}`;
}

function getDisplayTitle(item) {
  return isGroupItem(item) ? (item?.title || 'Беседа') : getDisplayName(item);
}

function getPreviewMembers(item) {
  if (!isGroupItem(item)) return '';
  return (item.members || []).filter((m) => m.id !== currentUser?.id).slice(0, 3).map((m) => m.name).join(', ');
}

function resolveCurrentDialogMessage(message) {
  if (!currentDialogUser || !message) return false;
  if (isGroupItem(currentDialogUser)) return String(message.conversationId || '') === String(currentDialogUser.id);
  return String(message.dialogId || '') === [currentUser.id, currentDialogUser.id].sort().join(':');
}

function getAlbumItemsForMessage(message) {
  if (!message) return [];
  const mediaMessages = currentMessages.filter((item) => !item.deletedAt && item.attachmentUrl && ['image', 'video'].includes(item.attachmentType));
  if (message.albumId) {
    const grouped = mediaMessages.filter((item) => item.albumId === message.albumId).sort((a, b) => Number(a.albumIndex || 0) - Number(b.albumIndex || 0));
    if (grouped.length > 1) {
      return grouped.map((item) => ({ url: resolveAssetUrl(item.attachmentUrl), type: item.attachmentType, name: item.attachmentName || (item.attachmentType === 'video' ? 'Видео' : 'Фото') }));
    }
  }
  return mediaMessages.map((item) => ({ url: resolveAssetUrl(item.attachmentUrl), type: item.attachmentType, name: item.attachmentName || (item.attachmentType === 'video' ? 'Видео' : 'Фото') }));
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
  return (user && user.photo) ? resolveAssetUrl(user.photo) : '';
}

function getUserInitials(user) {
  const source = (getDisplayName(user) || user?.name || user?.phone || 'U').trim();
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';
}

function getAvatarImgMarkup(user, className = 'profile-avatar', alt = 'avatar') {
  const safeAlt = String(alt).replace(/"/g, '&quot;');
  const safeClass = String(className).replace(/"/g, '&quot;');
  const avatarUrl = getAvatar(user);

  if (!avatarUrl) {
    return `<div class="${safeClass} default-avatar" aria-label="${safeAlt}">${getUserInitials(user)}</div>`;
  }

  return `<img class="${safeClass}" src="${avatarUrl}" alt="${safeAlt}" loading="lazy" data-fallback-text="${getUserInitials(user)}" onerror="this.onerror=null;const fallback=document.createElement('div');fallback.className=this.className+' default-avatar';fallback.setAttribute('aria-label', this.alt || 'avatar');fallback.textContent=this.dataset.fallbackText||'U';this.replaceWith(fallback);" />`;
}

function formatPhoneForDisplay(phone = '') {
  return phone || 'Номер скрыт';
}

function formatPreview(user) {
  if (user.isBlocked) return 'Пользователь в черном списке';
  if (user.blockedByUser) return 'Пользователь ограничил переписку';
  if (!user.lastMessage) return user.phone ? formatPhoneForDisplay(user.phone) : 'Нажмите, чтобы начать диалог';
  const prefix = user.lastMessage.senderId === currentUser.id ? 'Вы: ' : '';
  return `${prefix}${describeMessagePreview(user.lastMessage)}`;
}


function describeMessagePreview(message) {
  if (!message) return 'Нажмите, чтобы начать диалог';
  if (message.deletedAt) return 'Сообщение удалено';
  if (message.attachmentType === 'image') return message.text ? `Фото · ${message.text}` : 'Фото';
  if (message.attachmentType === 'video') return message.text ? `Видео · ${message.text}` : 'Видео';
  return message.text || 'Новое сообщение';
}

function createAvatarElement(user, className = 'profile-avatar', alt = 'avatar') {
  const avatarUrl = getAvatar(user);
  const initials = getUserInitials(user);

  if (!avatarUrl) {
    const fallback = document.createElement('div');
    fallback.className = `${className} default-avatar`;
    fallback.setAttribute('aria-label', alt);
    fallback.dataset.avatarUrl = '';
    fallback.dataset.initials = initials;
    fallback.textContent = initials;
    return fallback;
  }

  const img = document.createElement('img');
  img.className = className;
  img.alt = alt;
  img.loading = 'eager';
  img.decoding = 'async';
  img.dataset.avatarUrl = avatarUrl;
  img.dataset.initials = initials;
  img.dataset.currentSrc = avatarUrl;
  img.src = avatarUrl;
  img.onerror = () => {
    if (img.dataset.currentSrc === DEFAULT_AVATAR) return;
    img.onerror = null;
    img.src = DEFAULT_AVATAR;
    img.dataset.currentSrc = DEFAULT_AVATAR;
  };
  return img;
}

function syncAvatarElement(target, user, className = 'profile-avatar', alt = 'avatar') {
  const avatarUrl = getAvatar(user) || '';
  const initials = getUserInitials(user);
  const isImg = target.tagName === 'IMG';

  if (!avatarUrl) {
    if (!target.classList.contains('default-avatar') || target.dataset.initials !== initials) {
      const fallback = document.createElement('div');
      fallback.className = `${className} default-avatar`;
      fallback.setAttribute('aria-label', alt);
      fallback.dataset.avatarUrl = '';
      fallback.dataset.initials = initials;
      fallback.textContent = initials;
      target.replaceWith(fallback);
    }
    return;
  }

  if (!isImg) {
    const img = document.createElement('img');
    img.className = className;
    img.alt = alt;
    img.loading = 'eager';
    img.decoding = 'async';
    img.dataset.avatarUrl = avatarUrl;
    img.dataset.initials = initials;
    img.dataset.currentSrc = avatarUrl;
    img.src = avatarUrl;
    img.onerror = () => {
      if (img.dataset.currentSrc === DEFAULT_AVATAR) return;
      img.onerror = null;
      img.src = DEFAULT_AVATAR;
      img.dataset.currentSrc = DEFAULT_AVATAR;
    };
    target.replaceWith(img);
    return;
  }

  target.className = className;
  target.alt = alt;
  target.dataset.avatarUrl = avatarUrl;
  target.dataset.initials = initials;
  if (target.dataset.currentSrc !== avatarUrl) {
    target.dataset.currentSrc = avatarUrl;
    target.src = avatarUrl;
  }
  target.onerror = () => {
    if (target.dataset.currentSrc === DEFAULT_AVATAR) return;
    target.onerror = null;
    target.src = DEFAULT_AVATAR;
    target.dataset.currentSrc = DEFAULT_AVATAR;
  };
}


function closeMediaViewer() {
  if (!mediaViewerModal || !mediaViewerContent) return;
  mediaViewerModal.classList.add('hidden');
  mediaViewerContent.querySelectorAll('video').forEach((video) => {
    try { video.pause(); } catch {}
  });
  mediaViewerContent.innerHTML = '';
  mediaViewerItems = [];
  mediaViewerIndex = 0;
  if (mediaViewerPrevBtn) mediaViewerPrevBtn.classList.add('hidden');
  if (mediaViewerNextBtn) mediaViewerNextBtn.classList.add('hidden');
}

function renderMediaViewer() {
  if (!mediaViewerModal || !mediaViewerContent || !mediaViewerItems.length) return;
  mediaViewerContent.innerHTML = '';
  const item = mediaViewerItems[mediaViewerIndex];
  let node = null;
  if (item.type === 'video') {
    node = document.createElement('video');
    node.src = item.url;
    node.controls = true;
    node.autoplay = true;
    node.className = 'media-viewer-video';
  } else {
    node = document.createElement('img');
    node.src = item.url;
    node.alt = item.name || 'Фото';
    node.className = 'media-viewer-image';
  }
  mediaViewerContent.appendChild(node);
  const multiple = mediaViewerItems.length > 1;
  if (mediaViewerPrevBtn) mediaViewerPrevBtn.classList.toggle('hidden', !multiple);
  if (mediaViewerNextBtn) mediaViewerNextBtn.classList.toggle('hidden', !multiple);
}

function openMediaViewer(input, type, name) {
  if (!mediaViewerModal || !mediaViewerContent) return;
  if (Array.isArray(input)) {
    mediaViewerItems = input;
    mediaViewerIndex = Math.max(0, Math.min(type || 0, mediaViewerItems.length - 1));
  } else {
    mediaViewerItems = [{ url: input, type, name }];
    mediaViewerIndex = 0;
  }
  renderMediaViewer();
  mediaViewerModal.classList.remove('hidden');
}

function shiftMediaViewer(step) {
  if (!mediaViewerItems.length) return;
  mediaViewerIndex = (mediaViewerIndex + step + mediaViewerItems.length) % mediaViewerItems.length;
  renderMediaViewer();
}

function renderAttachmentPreview(file) {
  if (!file || !attachmentModalPreview) return;
  const objectUrl = URL.createObjectURL(file);

  const card = document.createElement('div');
  card.className = 'attachment-preview-card';
  card.dataset.previewUrl = objectUrl;

  let mediaNode = null;
  if (file.type.startsWith('image/')) {
    mediaNode = document.createElement('img');
    mediaNode.src = objectUrl;
    mediaNode.alt = file.name;
    mediaNode.className = 'attachment-preview-media';
  } else if (file.type.startsWith('video/')) {
    mediaNode = document.createElement('video');
    mediaNode.src = objectUrl;
    mediaNode.controls = true;
    mediaNode.preload = 'metadata';
    mediaNode.className = 'attachment-preview-media';
  }

  const nameNode = document.createElement('div');
  nameNode.className = 'attachment-preview-name';
  nameNode.textContent = file.name;

  if (mediaNode) card.appendChild(mediaNode);
  card.appendChild(nameNode);
  attachmentModalPreview.appendChild(card);
}

function resetAttachmentPreview() {
  if (!attachmentModalPreview) return;
  attachmentModalPreview.querySelectorAll('[data-preview-url]').forEach((node) => {
    try { URL.revokeObjectURL(node.dataset.previewUrl); } catch {}
  });
  attachmentModalPreview.innerHTML = '';
}

function closeAttachmentModal() {
  if (attachmentModal) attachmentModal.classList.add('hidden');
  if (attachmentCaptionInput) attachmentCaptionInput.value = '';
  resetAttachmentPreview();
  pendingAttachments = [];
  if (messageAttachmentInput) messageAttachmentInput.value = '';
  if (attachmentSendBtn) attachmentSendBtn.disabled = false;
}

function setPendingAttachments(files) {
  const accepted = [...files].filter((file) => file && (/^image\//.test(file.type) || /^video\//.test(file.type))).slice(0, 10);
  if (!accepted.length) return;
  pendingAttachments = pendingAttachments.concat(accepted).slice(0, 10);
  if (attachmentModalTitle) attachmentModalTitle.textContent = pendingAttachments.length > 1 ? `Отправить ${pendingAttachments.length} файлов` : (pendingAttachments[0].type.startsWith('video/') ? 'Отправить видео' : 'Отправить изображение');
  if (attachmentCaptionInput && !attachmentCaptionInput.value) attachmentCaptionInput.value = messageInput.value.trim();
  resetAttachmentPreview();
  pendingAttachments.forEach(renderAttachmentPreview);
  if (attachmentModal) attachmentModal.classList.remove('hidden');
}

async function sendPendingAttachment() {
  if (!pendingAttachments.length || !currentDialogUser || isUploadingAttachment) return;
  isUploadingAttachment = true;
  if (attachmentSendBtn) attachmentSendBtn.disabled = true;
  const caption = (attachmentCaptionInput?.value || '').trim();
  const formData = new FormData();
  formData.append('currentUserId', currentUser.id);
  if (isGroupItem(currentDialogUser)) formData.append('conversationId', currentDialogUser.id);
  else formData.append('recipientId', currentDialogUser.id);
  formData.append('text', caption);
  pendingAttachments.forEach((file) => formData.append('files', file));

  try {
    const response = await fetch(apiUrl('/api/messages/upload'), { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Не удалось отправить вложение');
    closeAttachmentModal();
    messageInput.value = '';
  } catch (error) {
    alert(error.message || 'Не удалось отправить вложение');
    if (attachmentSendBtn) attachmentSendBtn.disabled = false;
  } finally {
    isUploadingAttachment = false;
  }
}

function loadNotificationPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTIFICATION_PREFS_KEY) || '{}');
    notificationPrefs = {
      soundEnabled: saved.soundEnabled !== false,
      silentMode: Boolean(saved.silentMode)
    };
  } catch {
    notificationPrefs = { soundEnabled: true, silentMode: false };
  }
}

function saveNotificationPrefs() {
  localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(notificationPrefs));
}

function syncNotificationControls() {
  if (soundToggle) soundToggle.checked = notificationPrefs.soundEnabled;
  if (silentModeToggle) silentModeToggle.checked = notificationPrefs.silentMode;
  if (soundToggleWrap) soundToggleWrap.classList.toggle('is-disabled', notificationPrefs.silentMode);
  if (soundToggle) soundToggle.disabled = notificationPrefs.silentMode;
}

function shouldMuteNotifications() {
  return Boolean(notificationPrefs.silentMode);
}

function playNotificationSound() {
  if (shouldMuteNotifications() || !notificationPrefs.soundEnabled) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    if (!audioContextRef) audioContextRef = new AudioContextClass();
    if (audioContextRef.state === 'suspended') audioContextRef.resume();

    const oscillator = audioContextRef.createOscillator();
    const gainNode = audioContextRef.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContextRef.currentTime);
    gainNode.gain.setValueAtTime(0.0001, audioContextRef.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.06, audioContextRef.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.currentTime + 0.22);
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.destination);
    oscillator.start();
    oscillator.stop(audioContextRef.currentTime + 0.24);
  } catch {}
}

async function showBrowserNotification(message) {
  if (shouldMuteNotifications() || !message || message.senderId === currentUser?.id) return;
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {}
  }

  if (Notification.permission !== 'granted') return;

  const sender = users.find((item) => item.id === message.senderId) || currentDialogUser || { name: message.senderName };
  const body = message.deletedAt ? 'Сообщение удалено' : (message.text || 'Новое сообщение');
  const notification = new Notification(getDisplayName(sender) || message.senderName || 'Новое сообщение', {
    body,
    icon: getAvatar(sender) || DEFAULT_AVATAR,
    badge: getAvatar(sender) || DEFAULT_AVATAR,
    tag: `dialog-${message.dialogId}`,
    renotify: false
  });
  notification.onclick = () => {
    window.focus();
    if (sender?.id) selectDialog(sender.id);
    notification.close();
  };
}

function handleIncomingNotification(message, isCurrentDialog) {
  if (!message || message.senderId === currentUser?.id || shouldMuteNotifications()) return;
  const shouldNotify = document.hidden || !isCurrentDialog;
  if (!shouldNotify) return;
  playNotificationSound();
  showBrowserNotification(message);
}

function createUserCard(user) {
  const card = document.createElement('div');
  card.className = 'user-card';
  card.dataset.userId = user.id;
  card.dataset.itemType = isGroupItem(user) ? 'group' : 'user';

  const main = document.createElement('div');
  main.className = 'user-main';

  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'avatar-wrap';
  avatarWrap.appendChild(createAvatarElement(user));
  const unreadBadge = document.createElement('div');
  unreadBadge.className = 'unread-badge hidden';
  avatarWrap.appendChild(unreadBadge);

  const contentWrap = document.createElement('div');
  contentWrap.className = 'user-main-content';

  const top = document.createElement('div');
  top.className = 'user-top';
  const nameLine = document.createElement('div');
  nameLine.className = 'user-name-line';
  const name = document.createElement('div');
  name.className = 'user-name';
  name.title = getDisplayTitle(user) || user.name || '';
  nameLine.appendChild(name);
  const presence = document.createElement('div');
  presence.className = 'presence';
  top.appendChild(nameLine);
  top.appendChild(presence);

  const preview = document.createElement('div');
  preview.className = 'user-preview';

  contentWrap.appendChild(top);
  contentWrap.appendChild(preview);
  main.appendChild(avatarWrap);
  main.appendChild(contentWrap);
  card.appendChild(main);
  card.addEventListener('click', () => selectDialog(card.dataset.userId, card.dataset.itemType));
  return card;
}

function updateUserCard(card, user) {
  card.dataset.userId = user.id;
  card.dataset.itemType = isGroupItem(user) ? 'group' : 'user';
  card.classList.toggle('active', currentDialogUser?.id === user.id);
  const avatarNode = card.querySelector('.profile-avatar, .default-avatar, .avatar-photo-shell');
  if (avatarNode) syncAvatarElement(avatarNode, user);
  const unread = card.querySelector('.unread-badge');
  if (unread) {
    if (user.unreadCount > 0) {
      unread.classList.remove('hidden');
      unread.textContent = user.unreadCount > 99 ? '99+' : user.unreadCount;
      unread.title = 'Новые непрочитанные сообщения';
    } else unread.classList.add('hidden');
  }
  const name = card.querySelector('.user-name');
  if (name) { name.textContent = getDisplayName(user) || user.name || 'Без имени'; name.title = name.textContent; }
  const preview = card.querySelector('.user-preview');
  if (preview) preview.textContent = formatPreview(user);
  const presence = card.querySelector('.presence');
  if (presence) {
    if (isGroupItem(user)) {
      presence.classList.remove('online');
      presence.textContent = `${user.memberCount || (user.members || []).length || 0} участ.`;
    } else {
      presence.textContent = '';
      presence.classList.toggle('online', onlineUserIds.has(user.id));
    }
  }
}

function renderUsers() {
  if (!users.length) {
    userList.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-users';
    empty.textContent = searchInput.value.trim() ? 'Пользователи не найдены.' : 'Диалогов пока нет. Найдите собеседника по номеру телефона.';
    userList.appendChild(empty);
    return;
  }

  const existingCards = new Map([...userList.querySelectorAll('.user-card')].map((card) => [`${card.dataset.itemType}:${card.dataset.userId}`, card]));
  userList.querySelectorAll('.empty-users').forEach((node) => node.remove());

  users.forEach((user, index) => {
    let card = existingCards.get(getItemId(user));
    if (!card) {
      card = createUserCard(user);
    }
    updateUserCard(card, user);
    const expectedNode = userList.children[index];
    if (expectedNode !== card) {
      userList.insertBefore(card, expectedNode || null);
    }
    existingCards.delete(getItemId(user));
  });

  existingCards.forEach((card) => card.remove());
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
  content.textContent = message.deletedAt ? 'Сообщение удалено' : (message.text || '');

  const attachmentUrl = message.attachmentUrl ? resolveAssetUrl(message.attachmentUrl) : '';
  let mediaNode = null;
  if (!message.deletedAt && attachmentUrl) {
    if (message.attachmentType === 'image') {
      mediaNode = document.createElement('img');
      mediaNode.className = 'dialog-media dialog-media-clickable';
      mediaNode.src = attachmentUrl;
      mediaNode.alt = message.attachmentName || 'Фото';
      mediaNode.loading = 'lazy';
      mediaNode.addEventListener('click', () => { const items = getAlbumItemsForMessage(message); const currentIndex = items.findIndex((item) => item.url === attachmentUrl); openMediaViewer(items, currentIndex >= 0 ? currentIndex : 0); });
    } else if (message.attachmentType === 'video') {
      mediaNode = document.createElement('video');
      mediaNode.className = 'dialog-video dialog-media-clickable';
      mediaNode.src = attachmentUrl;
      mediaNode.controls = true;
      mediaNode.preload = 'metadata';
      mediaNode.addEventListener('click', (event) => {
        if (event.target === mediaNode) {
          event.preventDefault();
          const items = getAlbumItemsForMessage(message); const currentIndex = items.findIndex((item) => item.url === attachmentUrl); openMediaViewer(items, currentIndex >= 0 ? currentIndex : 0);
        }
      });
    } else {
      mediaNode = document.createElement('a');
      mediaNode.className = 'message-attachment-link';
      mediaNode.href = attachmentUrl;
      mediaNode.target = '_blank';
      mediaNode.rel = 'noopener noreferrer';
      mediaNode.textContent = message.attachmentName || 'Открыть вложение';
    }
  }

  const meta = document.createElement('div');
  meta.className = 'meta';
  const editedMark = message.editedAt && !message.deletedAt ? '<span class="edited-mark">ред.</span>' : '';
  meta.innerHTML = `<span>${getTime(message.createdAt)}</span>${editedMark}${getStatusDots(message)}`;

  node.appendChild(sender);
  if (content.textContent || message.deletedAt) node.appendChild(content);
  if (mediaNode) node.appendChild(mediaNode);

  if (isMe && !message.deletedAt && !message.conversationId) {
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
  currentMessages.push(message);
  chat.appendChild(createMessageNode(message));
  scrollChatToBottom();
}

function upsertMessage(message) {
  const existingIndex = currentMessages.findIndex((item) => item.id === message.id);
  if (existingIndex >= 0) currentMessages[existingIndex] = message; else currentMessages.push(message);
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
  if (messageAttachBtn) messageAttachBtn.disabled = !currentDialogState.canMessage;
  if (!editingMessageId) {
    messageInput.placeholder = currentDialogState.canMessage ? 'Введите сообщение...' : 'Отправка сообщений недоступна';
  }
}

async function loadUsers() {
  const search = searchInput.value.trim();
  const [usersResponse, conversationsResponse] = await Promise.all([
    fetch(apiUrl(`/api/users?currentUserId=${encodeURIComponent(currentUser.id)}&search=${encodeURIComponent(search)}`)),
    fetch(apiUrl(`/api/conversations?currentUserId=${encodeURIComponent(currentUser.id)}&search=${encodeURIComponent(search)}`))
  ]);
  const usersData = await usersResponse.json();
  const conversationsData = await conversationsResponse.json();
  directUsers = usersData.users || [];
  conversations = conversationsData.conversations || [];
  users = [...conversations, ...directUsers].sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));

  if (currentDialogUser) {
    const foundCurrent = users.find((user) => user.id === currentDialogUser.id && isGroupItem(user) === isGroupItem(currentDialogUser));
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
  showDialogUI(Boolean(currentDialogUser));
}

async function loadContacts() {
  const response = await fetch(apiUrl(`/api/contacts?currentUserId=${encodeURIComponent(currentUser.id)}`));
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Не удалось получить контакты');
  contacts = data.users || [];
  renderGroupMembers();
}

async function loadPresence() {
  const response = await fetch(apiUrl('/api/presence'));
  const data = await response.json();
  onlineUserIds = new Set(data.onlineUserIds || []);
  renderUsers();
}

function updateDialogHeader() {
  if (!currentDialogUser) {
    dialogTitle.textContent = 'Выберите диалог';
    dialogSubtitle.textContent = 'Личные сообщения и беседы в реальном времени';
    backToDialogsBtn.classList.add('hidden');
    renameDialogBtn.classList.add('hidden');
    return;
  }

  dialogTitle.textContent = getDisplayTitle(currentDialogUser);
  renameDialogBtn.classList.toggle('hidden', isGroupItem(currentDialogUser));
  if (isGroupItem(currentDialogUser)) {
    dialogSubtitle.textContent = `${currentDialogUser.memberCount || (currentDialogUser.members || []).length} участников · ${getPreviewMembers(currentDialogUser)}`;
  } else {
    const phoneText = currentDialogUser.phone ? currentDialogUser.phone : 'Номер скрыт';
    dialogSubtitle.textContent = onlineUserIds.has(currentDialogUser.id)
      ? `${phoneText} · онлайн`
      : phoneText;
  }
  backToDialogsBtn.classList.remove('hidden');
}

async function selectDialog(userId, itemType = 'user') {
  const selected = users.find((user) => user.id === userId && (itemType === 'group' ? isGroupItem(user) : !isGroupItem(user)));
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

  const response = await fetch(isGroupItem(selected)
    ? apiUrl(`/api/messages/conversation/${userId}?currentUserId=${encodeURIComponent(currentUser.id)}`)
    : apiUrl(`/api/messages/${userId}?currentUserId=${encodeURIComponent(currentUser.id)}`));
  const data = await response.json();

  currentDialogState = {
    canMessage: data.canMessage !== false,
    isBlocked: Boolean(data.isBlocked),
    blockedByUser: Boolean(data.blockedByUser)
  };

  chat.innerHTML = '';
  currentMessages = data.messages || [];
  shouldStickToBottom = true;
  currentMessages.forEach((message) => {
    chat.appendChild(createMessageNode(message));
  });
  scrollChatToBottom(true);
  applyDialogRestrictions();
  renderUsers();
  updateDialogHeader();

  if (socket) {
    if (isGroupItem(selected)) socket.emit('open-conversation', { currentUserId: currentUser.id, conversationId: userId });
    else socket.emit('open-dialog', { currentUserId: currentUser.id, otherUserId: userId });
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
  currentMessages = [];
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
    const isCurrentDialog = resolveCurrentDialogMessage(message);
    if (isCurrentDialog) {
      addMessage(message);
      if (isGroupItem(currentDialogUser)) socket.emit('open-conversation', { currentUserId: currentUser.id, conversationId: currentDialogUser.id }); else socket.emit('open-dialog', { currentUserId: currentUser.id, otherUserId: currentDialogUser.id });
    }
    handleIncomingNotification(message, Boolean(isCurrentDialog));
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
  if (!currentDialogUser || !currentDialogState.canMessage) return;

  if (editingMessageId) {
    if (!text) return;
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

  if (pendingAttachments.length) {
    await sendPendingAttachment();
    return;
  }

  if (!text || !socket) return;
  if (isGroupItem(currentDialogUser)) socket.emit('send-message', { text, conversationId: currentDialogUser.id });
  else socket.emit('send-private-message', { text, recipientId: currentDialogUser.id });
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
        ${getAvatarImgMarkup(user)}
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

function renderGroupMembers() {
  if (!groupMembersList) return;
  groupMembersList.innerHTML = '';
  contacts.forEach((user) => {
    const row = document.createElement('label');
    row.className = 'group-member-option';
    row.innerHTML = `<input type="checkbox" value="${user.id}" /> <span>${user.name}</span>`;
    groupMembersList.appendChild(row);
  });
}

async function openGroupModal() {
  if (!currentUser || !groupModal) return;
  if (groupTitleInput) groupTitleInput.value = '';
  groupModal.classList.remove('hidden');
  try {
    await loadContacts();
  } catch (error) {
    console.error('group modal load error', error);
    if (groupMembersList) groupMembersList.innerHTML = '<div class="group-members-empty">Не удалось загрузить список контактов</div>';
  }
}

function closeGroupModal() {
  if (groupModal) groupModal.classList.add('hidden');
}

async function saveGroupConversation() {
  const title = groupTitleInput?.value.trim();
  const memberIds = [...(groupMembersList?.querySelectorAll('input:checked') || [])].map((input) => input.value);
  if (!title || title.length < 2) return alert('Введите название беседы');
  if (!memberIds.length) return alert('Выберите хотя бы одного участника');
  if (saveGroupBtn) saveGroupBtn.disabled = true;
  try {
    const response = await fetch(apiUrl('/api/conversations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUserId: currentUser.id, title, memberIds })
    });
    const data = await response.json();
    if (!response.ok) return alert(data.error || 'Не удалось создать беседу');
    closeGroupModal();
    await loadUsers();
    await selectDialog(data.conversation.id, 'group');
  } catch (error) {
    console.error('save group error', error);
    alert('Не удалось создать беседу');
  } finally {
    if (saveGroupBtn) saveGroupBtn.disabled = false;
  }
}

function openProfileModal() {
  profileNameInput.value = currentUser?.name || '';
  profilePhonePreview.textContent = currentUser?.phone || '';
  showPhoneToggle.checked = currentUser?.showPhone !== false;
  syncNotificationControls();
  profilePreviewAvatar.src = getAvatar(currentUser) || DEFAULT_AVATAR;
  profilePreviewAvatar.onerror = () => { profilePreviewAvatar.onerror = null; profilePreviewAvatar.src = DEFAULT_AVATAR; };
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
        showPhone: showPhoneToggle.checked
      })
    });
    const nameData = await nameResponse.json();
    if (!nameResponse.ok) throw new Error(nameData.error || 'Не удалось обновить профиль');

    notificationPrefs = {
      soundEnabled: soundToggle ? soundToggle.checked : true,
      silentMode: silentModeToggle ? silentModeToggle.checked : false
    };
    saveNotificationPrefs();
    syncNotificationControls();

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
if (createGroupBtn) createGroupBtn.addEventListener('click', openGroupModal);
if (closeGroupBtn) closeGroupBtn.addEventListener('click', closeGroupModal);
if (saveGroupBtn) saveGroupBtn.addEventListener('click', saveGroupConversation);

if (messageAttachBtn) {
  messageAttachBtn.addEventListener('click', () => messageAttachmentInput.click());
}

if (messageAttachmentInput) {
  messageAttachmentInput.addEventListener('change', () => {
    const files = [...messageAttachmentInput.files];
    if (files.length) setPendingAttachments(files);
  });
}


if (attachmentModalCloseBtn) attachmentModalCloseBtn.addEventListener('click', closeAttachmentModal);
if (attachmentCancelBtn) attachmentCancelBtn.addEventListener('click', closeAttachmentModal);
if (mediaViewerCloseBtn) mediaViewerCloseBtn.addEventListener('click', closeMediaViewer);
if (mediaViewerModal) {
  mediaViewerModal.addEventListener('click', (event) => {
    if (event.target === mediaViewerModal) closeMediaViewer();
  });
}
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mediaViewerModal && !mediaViewerModal.classList.contains('hidden')) { closeMediaViewer(); }
  if (event.key === 'ArrowLeft' && mediaViewerModal && !mediaViewerModal.classList.contains('hidden')) { shiftMediaViewer(-1); }
  if (event.key === 'ArrowRight' && mediaViewerModal && !mediaViewerModal.classList.contains('hidden')) { shiftMediaViewer(1); }
});

if (attachmentCancelBtn) attachmentCancelBtn.addEventListener('click', closeAttachmentModal);
if (attachmentChooseAnotherBtn) attachmentChooseAnotherBtn.addEventListener('click', () => messageAttachmentInput && messageAttachmentInput.click());
if (attachmentSendBtn) attachmentSendBtn.addEventListener('click', sendPendingAttachment);
if (mediaViewerPrevBtn) mediaViewerPrevBtn.addEventListener('click', () => shiftMediaViewer(-1));
if (mediaViewerNextBtn) mediaViewerNextBtn.addEventListener('click', () => shiftMediaViewer(1));

function handleDragState(active) {
  if (!currentDialogState.canMessage) return;
  inputArea.classList.toggle('drag-over', active);
  if (chatPanel) chatPanel.classList.toggle('drag-over', active);
}

['dragenter', 'dragover'].forEach((eventName) => {
  [inputArea, chatPanel].filter(Boolean).forEach((dropTarget) => {
    dropTarget.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleDragState(true);
    });
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  [inputArea, chatPanel].filter(Boolean).forEach((dropTarget) => {
    dropTarget.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (eventName === 'drop') {
        const files = [...(event.dataTransfer?.files || [])];
        if (files.length && currentDialogUser && currentDialogState.canMessage) {
          setPendingAttachments(files);
        }
      }
      handleDragState(false);
    });
  });
});

window.addEventListener('drop', (event) => event.preventDefault());
window.addEventListener('dragover', (event) => event.preventDefault());

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

if (silentModeToggle) {
  silentModeToggle.addEventListener('change', () => {
    notificationPrefs.silentMode = silentModeToggle.checked;
    syncNotificationControls();
  });
}

if (soundToggle) {
  soundToggle.addEventListener('change', () => {
    notificationPrefs.soundEnabled = soundToggle.checked;
  });
}

if (themeSwitcher) {
  themeSwitcher.addEventListener('click', (event) => {
    const button = event.target.closest('.theme-option');
    if (!button) return;
    applyTheme(button.dataset.themeValue);
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
  loadNotificationPrefs();
  syncNotificationControls();
  const savedUser = localStorage.getItem('messengerCurrentUser');
  if (!savedUser) return;

  try {
    currentUser = JSON.parse(savedUser);
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
