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
const dialogProfileTrigger = document.getElementById('dialogProfileTrigger');
const backToDialogsBtn = document.getElementById('backToDialogsBtn');
const emptyState = document.getElementById('emptyState');
const chat = document.getElementById('chat');
const chatPanel = document.querySelector('.chat-panel');
const inputArea = document.getElementById('inputArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messageAttachBtn = document.getElementById('messageAttachBtn');
const voiceRecordBtn = document.getElementById('voiceRecordBtn');
const composerTextRow = document.getElementById('composerTextRow');
const voiceRecordingPanel = document.getElementById('voiceRecordingPanel');
const voiceRecordingWave = document.getElementById('voiceRecordingWave');
const voiceRecordingTime = document.getElementById('voiceRecordingTime');
const cancelVoiceRecordingBtn = document.getElementById('cancelVoiceRecordingBtn');
const sendVoiceRecordingBtn = document.getElementById('sendVoiceRecordingBtn');
const voiceRecordingSwipeHint = document.getElementById('voiceRecordingSwipeHint');
const voiceRecordingShell = document.querySelector('.voice-recording-shell');
const messageAttachmentInput = document.getElementById('messageAttachmentInput');
const messageAttachmentPreview = document.getElementById('messageAttachmentPreview');
const messageAttachmentName = document.getElementById('messageAttachmentName');
const clearMessageAttachmentBtn = document.getElementById('clearMessageAttachmentBtn');
const messageAttachmentPreviewMedia = document.getElementById('messageAttachmentPreviewMedia');
const attachmentModal = document.getElementById('attachmentModal');
const attachmentModalTitle = document.getElementById('attachmentModalTitle');
const attachmentModalPreview = document.getElementById('attachmentModalPreview');
const attachmentModalPrevBtn = document.getElementById('attachmentModalPrevBtn');
const attachmentModalNextBtn = document.getElementById('attachmentModalNextBtn');
const attachmentModalCounter = document.getElementById('attachmentModalCounter');
const attachmentModalThumbs = document.getElementById('attachmentModalThumbs');
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
const mediaViewerCounter = document.getElementById('mediaViewerCounter');
const composerDropHint = document.getElementById('composerDropHint');
const profileModal = document.getElementById('profileModal');
const contactProfileModal = document.getElementById('contactProfileModal');
const contactProfileAvatar = document.getElementById('contactProfileAvatar');
const contactProfileName = document.getElementById('contactProfileName');
const contactProfileStatus = document.getElementById('contactProfileStatus');
const contactProfileNameField = document.getElementById('contactProfileNameField');
const contactProfilePhone = document.getElementById('contactProfilePhone');
const contactProfileId = document.getElementById('contactProfileId');
const contactProfileDialogType = document.getElementById('contactProfileDialogType');
const contactProfileCreatedAt = document.getElementById('contactProfileCreatedAt');
const contactProfileLastSeen = document.getElementById('contactProfileLastSeen');
const contactProfileActions = document.getElementById('contactProfileActions');
const changeGroupPhotoBtn = document.getElementById('changeGroupPhotoBtn');
const groupPhotoInput = document.getElementById('groupPhotoInput');
const closeContactProfileBtn = document.getElementById('closeContactProfileBtn');
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
const contactBlockToggleBtn = document.getElementById('contactBlockToggleBtn');
const contactRenameDialogBtn = document.getElementById('contactRenameDialogBtn');
const chatStatusBanner = document.getElementById('chatStatusBanner');
const settingsTabs = document.querySelectorAll('.settings-tab');
const settingsPanels = document.querySelectorAll('.settings-panel');
const blacklistList = document.getElementById('blacklistList');
const blacklistEmpty = document.getElementById('blacklistEmpty');
const chatScrollControls = document.getElementById('chatScrollControls');
const scrollToTopBtn = document.getElementById('scrollToTopBtn');
const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
const themeSwitcher = document.getElementById('themeSwitcher');
const createGroupBtn = document.getElementById('createGroupBtn');
const groupModal = document.getElementById('groupModal');
const groupNameInput = document.getElementById('groupNameInput');
const groupMembersList = document.getElementById('groupMembersList');
const groupModalTitle = document.getElementById('groupModalTitle');
const groupNameWrap = document.getElementById('groupNameWrap');
const cancelGroupBtn = document.getElementById('cancelGroupBtn');
const saveGroupBtn = document.getElementById('saveGroupBtn');
const addGroupMembersBtn = document.getElementById('addGroupMembersBtn');
const contactSuggestAvatarBtn = document.getElementById('contactSuggestAvatarBtn');
const avatarSuggestionInput = document.getElementById('avatarSuggestionInput');

const APP_CONFIG = window.APP_CONFIG || {};
const API_BASE_URL = String(APP_CONFIG.API_BASE_URL || '').replace(/\/$/, '');
const SOCKET_URL = String(APP_CONFIG.SOCKET_URL || API_BASE_URL || '').replace(/\/$/, '');
const groupModalState = {
  mode: 'create',
  groupId: ''
};

function apiUrl(path) {
  if (!path.startsWith('/')) return `${API_BASE_URL}/${path}`;
  return `${API_BASE_URL}${path}`;
}

function createClientMessageId(prefix = 'msg') {
  if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}


const OFFICE_FILE_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf', '.pdf', '.txt', '.odt', '.ods', '.odp'];

function isOfficeFile(file) {
  if (!file) return false;
  const mime = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  return mime.includes('word')
    || mime.includes('excel')
    || mime.includes('powerpoint')
    || mime.includes('officedocument')
    || mime.includes('opendocument')
    || mime === 'application/pdf'
    || mime === 'application/msword'
    || mime === 'text/plain'
    || mime === 'application/rtf'
    || mime === 'text/rtf'
    || OFFICE_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function getAttachmentKind(file) {
  if (!file) return '';
  if (String(file.type || '').startsWith('image/')) return 'image';
  if (String(file.type || '').startsWith('video/')) return 'video';
  if (String(file.type || '').startsWith('audio/')) return 'audio';
  if (isOfficeFile(file)) return 'document';
  return '';
}

function getDocumentLabel(name = '') {
  const lower = String(name).toLowerCase();
  if (lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.odt') || lower.endsWith('.rtf')) return 'DOC';
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.ods')) return 'XLS';
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx') || lower.endsWith('.odp')) return 'PPT';
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.txt')) return 'TXT';
  return 'FILE';
}

async function parseApiResponse(response) {
  const rawText = await response.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const message = data?.error || (rawText && !/^<!DOCTYPE/i.test(rawText) ? rawText : '') || `Ошибка сервера (${response.status})`;
    throw new Error(message);
  }
  if (data) return data;
  if (!rawText) return {};
  throw new Error('Сервер вернул неожиданный ответ');
}


let mode = 'register';
let currentUser = null;
let currentDialogUser = null;
let currentDialogProfile = null;
let lastSeenMap = {};
let users = [];
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
let pendingAttachmentIndex = 0;
let isUploadingAttachment = false;
let currentDialogMessages = [];
let mediaViewerItems = [];
let mediaViewerIndex = 0;
let mediaRecorder = null;
let mediaRecorderStream = null;
let recordedChunks = [];
let isRecordingVoice = false;
let recordingStartedAt = 0;
let recordingTimerId = null;
let recordingAnimationId = null;
let pendingVoiceSendOnStop = false;
let recordingAnalyser = null;
let recordingAnalyserData = null;
let recordingAudioContext = null;
let recordingSourceNode = null;
let recordingDragState = null;
let isFinishingVoiceRecording = false;
let isSubmittingTextMessage = false;


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
  if (user.type === 'group') return user.name || 'Беседа';
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

function formatContactProfileDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function updateDialogProfileTriggerState() {
  if (!dialogProfileTrigger) return;
  const canOpen = Boolean(currentDialogUser);
  dialogProfileTrigger.classList.toggle('is-disabled', !canOpen);
  dialogProfileTrigger.title = canOpen
    ? (currentDialogUser?.type === 'group' ? 'Открыть информацию о беседе' : 'Открыть профиль собеседника')
    : 'Сначала выберите диалог';
}

async function openContactProfile() {
  if (!currentDialogUser || !contactProfileModal) return;

  if (currentDialogUser.type === 'group') {
    currentDialogProfile = {
      ...currentDialogUser,
      createdAt: currentDialogUser.createdAt || null,
      phone: '',
      showPhone: false
    };

    if (contactProfileAvatar) {
      contactProfileAvatar.src = getAvatar(currentDialogUser) || DEFAULT_AVATAR;
      contactProfileAvatar.onerror = () => {
        contactProfileAvatar.onerror = null;
        contactProfileAvatar.src = DEFAULT_AVATAR;
      };
    }
    if (contactProfileName) contactProfileName.textContent = currentDialogUser.name || 'Беседа';
    if (contactProfileStatus) {
      const count = Array.isArray(currentDialogUser.memberIds) ? currentDialogUser.memberIds.length : 0;
      contactProfileStatus.textContent = count ? `Участников: ${count}` : 'Групповая беседа';
    }
    contactProfileActions?.classList.remove('hidden');
    changeGroupPhotoBtn?.classList.remove('hidden');
    contactSuggestAvatarBtn?.classList.add('hidden');
    contactRenameDialogBtn?.classList.add('hidden');
    contactBlockToggleBtn?.classList.add('hidden');
    if (contactProfileNameField) contactProfileNameField.textContent = currentDialogUser.name || '—';
    if (contactProfilePhone) contactProfilePhone.textContent = '—';
    if (contactProfileId) contactProfileId.textContent = currentDialogUser.rawId || String(currentDialogUser.id || '').replace(/^group:/, '') || '—';
    if (contactProfileDialogType) contactProfileDialogType.textContent = 'Групповая беседа';
    if (contactProfileCreatedAt) contactProfileCreatedAt.textContent = formatContactProfileDate(currentDialogUser.createdAt);
    if (contactProfileLastSeen) contactProfileLastSeen.textContent = '—';
    contactProfileModal.classList.remove('hidden');
    return;
  }

  try {
    dialogProfileTrigger?.classList.add('is-loading');
    const response = await fetch(apiUrl(`/api/users/${encodeURIComponent(currentDialogUser.id)}/profile?currentUserId=${encodeURIComponent(currentUser.id)}`));
    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }
    if (!response.ok) {
      throw new Error(data?.error || 'Не удалось открыть профиль');
    }

    const profileUser = data?.user || currentDialogUser;
    currentDialogProfile = profileUser;

    if (contactProfileAvatar) {
      contactProfileAvatar.src = getAvatar(profileUser) || DEFAULT_AVATAR;
      contactProfileAvatar.onerror = () => {
        contactProfileAvatar.onerror = null;
        contactProfileAvatar.src = DEFAULT_AVATAR;
      };
    }
    if (contactProfileName) contactProfileName.textContent = getDisplayName(profileUser) || profileUser.name || 'Пользователь';
    if (contactProfileStatus) contactProfileStatus.textContent = getPresenceText(profileUser);
    contactProfileActions?.classList.remove('hidden');
    changeGroupPhotoBtn?.classList.add('hidden');
    contactSuggestAvatarBtn?.classList.remove('hidden');
    contactRenameDialogBtn?.classList.remove('hidden');
    contactBlockToggleBtn?.classList.remove('hidden');
    contactBlockToggleBtn.textContent = currentDialogState.isBlocked ? 'Убрать из чёрного списка' : 'В чёрный список';
    if (contactProfileNameField) contactProfileNameField.textContent = profileUser.name || '—';
    if (contactProfilePhone) contactProfilePhone.textContent = profileUser.phone || 'Номер скрыт';
    if (contactProfileId) contactProfileId.textContent = profileUser.id || '—';
    if (contactProfileDialogType) contactProfileDialogType.textContent = 'Личный диалог';
    if (contactProfileCreatedAt) contactProfileCreatedAt.textContent = formatContactProfileDate(profileUser.createdAt);
    if (contactProfileLastSeen) contactProfileLastSeen.textContent = onlineUserIds.has(profileUser.id) ? 'Сейчас в сети' : formatLastSeen(profileUser.lastSeenAt || lastSeenMap[String(profileUser.id)] || null);

    contactProfileModal.classList.remove('hidden');
  } catch (error) {
    alert(error.message || 'Не удалось открыть профиль');
  } finally {
    dialogProfileTrigger?.classList.remove('is-loading');
  }
}

function closeContactProfile() {
  if (!contactProfileModal) return;
  contactProfileModal.classList.add('hidden');
  changeGroupPhotoBtn?.classList.add('hidden');
  contactSuggestAvatarBtn?.classList.add('hidden');
  contactRenameDialogBtn?.classList.add('hidden');
  contactBlockToggleBtn?.classList.add('hidden');
}

function formatPreview(user) {
  if (user.type !== 'group') {
    if (user.isBlocked) return 'Пользователь в черном списке';
    if (user.blockedByUser) return 'Пользователь ограничил переписку';
  }
  if (!user.lastMessage) return user.type === 'group' ? 'Нажмите, чтобы открыть беседу' : (user.phone ? formatPhoneForDisplay(user.phone) : 'Нажмите, чтобы начать диалог');
  const senderPrefix = user.lastMessage.senderId === currentUser.id ? 'Вы: ' : (user.type === 'group' && user.lastMessage.senderName ? `${user.lastMessage.senderName}: ` : '');
  return `${senderPrefix}${describeMessagePreview(user.lastMessage)}`;
}


function describeMessagePreview(message) {
  if (!message) return 'Нажмите, чтобы начать диалог';
  if (message.deletedAt) return 'Сообщение удалено';
  if (message.attachmentType === 'image') return message.text ? `Фото · ${message.text}` : 'Фото';
  if (message.attachmentType === 'video') return message.text ? `Видео · ${message.text}` : 'Видео';
  if (message.attachmentType === 'audio') return message.text ? `Голосовое · ${message.text}` : 'Голосовое сообщение';
  if (message.attachmentType === 'document') return message.text ? `Файл · ${message.text}` : 'Файл';
  if (message.attachmentType === 'avatar_suggestion') return message.text ? `Предложение аватарки · ${message.text}` : 'Предложение аватарки';
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



function getPendingAttachment() {
  return pendingAttachments[pendingAttachmentIndex] || null;
}

function getCurrentDialogMediaItems() {
  return currentDialogMessages
    .filter((message) => !message?.deletedAt && message?.attachmentUrl && (message.attachmentType === 'image' || message.attachmentType === 'video'))
    .map((message) => ({
      url: resolveAssetUrl(message.attachmentUrl),
      type: message.attachmentType,
      name: message.attachmentName || (message.attachmentType === 'video' ? 'Видео' : 'Фото'),
      id: message.id
    }));
}

function updateMediaViewerControls() {
  const hasMany = mediaViewerItems.length > 1;
  if (mediaViewerPrevBtn) mediaViewerPrevBtn.classList.toggle('hidden', !hasMany);
  if (mediaViewerNextBtn) mediaViewerNextBtn.classList.toggle('hidden', !hasMany);
  if (mediaViewerCounter) {
    mediaViewerCounter.classList.toggle('hidden', mediaViewerItems.length <= 1);
    mediaViewerCounter.textContent = mediaViewerItems.length > 1 ? `${mediaViewerIndex + 1} / ${mediaViewerItems.length}` : '';
  }
}

function renderMediaViewerItem() {
  if (!mediaViewerModal || !mediaViewerContent || !mediaViewerItems.length) return;
  const item = mediaViewerItems[mediaViewerIndex];
  mediaViewerContent.innerHTML = '';
  let node;
  if (item.type === 'video') {
    node = document.createElement('video');
    node.className = 'media-viewer-video';
    node.src = item.url;
    node.controls = true;
    node.autoplay = true;
    node.playsInline = true;
    node.preload = 'metadata';
  } else {
    node = document.createElement('img');
    node.className = 'media-viewer-image';
    node.src = item.url;
    node.alt = item.name || 'Вложение';
  }
  mediaViewerContent.appendChild(node);
  updateMediaViewerControls();
}

function closeMediaViewer() {
  if (!mediaViewerModal || !mediaViewerContent) return;
  mediaViewerModal.classList.add('hidden');
  mediaViewerContent.querySelectorAll('video').forEach((video) => {
    try { video.pause(); } catch (e) {}
    video.removeAttribute('src');
    try { video.load(); } catch (e) {}
  });
  mediaViewerContent.innerHTML = '';
  mediaViewerItems = [];
  mediaViewerIndex = 0;
  updateMediaViewerControls();
}

function openMediaViewer(url, type, name) {
  if (!mediaViewerModal || !mediaViewerContent || !url) return;
  const items = getCurrentDialogMediaItems();
  const foundIndex = items.findIndex((item) => item.url === url);
  mediaViewerItems = items.length ? items : [{ url, type, name }];
  mediaViewerIndex = foundIndex >= 0 ? foundIndex : 0;
  renderMediaViewerItem();
  mediaViewerModal.classList.remove('hidden');
}

function stepMediaViewer(direction) {
  if (mediaViewerItems.length <= 1) return;
  mediaViewerIndex = (mediaViewerIndex + direction + mediaViewerItems.length) % mediaViewerItems.length;
  renderMediaViewerItem();
}

function clearAttachmentPreviewElement() {
  if (attachmentModalPreview) {
    attachmentModalPreview.querySelectorAll('[data-preview-url]').forEach((node) => {
      try { URL.revokeObjectURL(node.dataset.previewUrl); } catch {}
    });
    attachmentModalPreview.innerHTML = '';
  }
  if (attachmentModalThumbs) attachmentModalThumbs.innerHTML = '';
}

function updateAttachmentPreviewControls() {
  const hasMany = pendingAttachments.length > 1;
  if (attachmentModalPrevBtn) attachmentModalPrevBtn.classList.toggle('hidden', !hasMany);
  if (attachmentModalNextBtn) attachmentModalNextBtn.classList.toggle('hidden', !hasMany);
  if (attachmentModalCounter) {
    attachmentModalCounter.classList.toggle('hidden', !hasMany);
    attachmentModalCounter.textContent = hasMany ? `${pendingAttachmentIndex + 1} / ${pendingAttachments.length}` : '';
  }
  if (attachmentModalThumbs) attachmentModalThumbs.classList.toggle('hidden', !hasMany);
}

function createAttachmentPreviewElement(file) {
  if (!file || !attachmentModalPreview) return;
  attachmentModalPreview.innerHTML = '';
  const previewUrl = URL.createObjectURL(file);
  let mediaNode;

  if (file.type.startsWith('video/')) {
    mediaNode = document.createElement('video');
    mediaNode.className = 'attachment-preview-media';
    mediaNode.src = previewUrl;
    mediaNode.muted = true;
    mediaNode.playsInline = true;
    mediaNode.preload = 'metadata';
    mediaNode.controls = true;
  } else if (file.type.startsWith('audio/')) {
    mediaNode = document.createElement('audio');
    mediaNode.className = 'attachment-preview-media';
    mediaNode.src = previewUrl;
    mediaNode.controls = true;
  } else if (getAttachmentKind(file) === 'document') {
    mediaNode = document.createElement('div');
    mediaNode.className = 'attachment-preview-file-card';
    mediaNode.innerHTML = `<div class="attachment-preview-file-icon">${getDocumentLabel(file.name)}</div><div class="attachment-preview-file-meta"><strong>${file.name || 'Документ'}</strong><span>${formatAttachmentSize(file)}</span></div>`;
  } else {
    mediaNode = document.createElement('img');
    mediaNode.className = 'attachment-preview-media';
    mediaNode.src = previewUrl;
    mediaNode.alt = file.name || 'preview';
  }

  mediaNode.dataset.previewUrl = previewUrl;
  attachmentModalPreview.appendChild(mediaNode);
}

function renderAttachmentThumbs() {
  if (!attachmentModalThumbs) return;
  attachmentModalThumbs.innerHTML = '';
  pendingAttachments.forEach((file, index) => {
    const kind = getAttachmentKind(file);
    let thumb;
    if (kind === 'video') {
      thumb = document.createElement('video');
      const thumbUrl = URL.createObjectURL(file);
      thumb.dataset.previewUrl = thumbUrl;
      thumb.src = thumbUrl;
      thumb.muted = true;
      thumb.playsInline = true;
      thumb.preload = 'metadata';
    } else if (kind === 'document' || kind === 'audio') {
      thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'attachment-thumb attachment-thumb-file';
      thumb.textContent = kind === 'audio' ? '🎤' : getDocumentLabel(file.name);
    } else {
      thumb = document.createElement('img');
      const thumbUrl = URL.createObjectURL(file);
      thumb.dataset.previewUrl = thumbUrl;
      thumb.src = thumbUrl;
      thumb.alt = file.name || `Файл ${index + 1}`;
    }
    thumb.className = `${thumb.className || 'attachment-thumb'} ${index === pendingAttachmentIndex ? 'active' : ''}`.trim();
    thumb.addEventListener('click', () => {
      pendingAttachmentIndex = index;
      renderPendingAttachmentPreview();
    });
    attachmentModalThumbs.appendChild(thumb);
  });
}

function renderPendingAttachmentPreview() {
  const file = getPendingAttachment();
  if (!file) return;
  createAttachmentPreviewElement(file);
  renderAttachmentThumbs();
  updateAttachmentPreviewControls();
  if (attachmentModalTitle) {
    if (pendingAttachments.length > 1) attachmentModalTitle.textContent = `Отправить файлы (${pendingAttachments.length})`;
    else attachmentModalTitle.textContent = getAttachmentKind(file) === 'video' ? 'Отправить видео' : (getAttachmentKind(file) === 'audio' ? 'Отправить голосовое сообщение' : (getAttachmentKind(file) === 'document' ? 'Отправить документ' : 'Отправить изображение')); 
  }
}

function closeAttachmentModal() {
  if (attachmentModal) attachmentModal.classList.add('hidden');
  if (attachmentCaptionInput) attachmentCaptionInput.value = '';
  clearAttachmentPreviewElement();
  pendingAttachments = [];
  pendingAttachmentIndex = 0;
  if (messageAttachmentInput) messageAttachmentInput.value = '';
  isUploadingAttachment = false;
  if (attachmentSendBtn) attachmentSendBtn.disabled = false;
}

function openAttachmentModal(files) {
  if (!files || !files.length) return;
  pendingAttachments = files;
  pendingAttachmentIndex = 0;
  if (attachmentCaptionInput) attachmentCaptionInput.value = messageInput.value.trim();
  renderPendingAttachmentPreview();
  if (attachmentModal) attachmentModal.classList.remove('hidden');
}

function setPendingAttachment(input) {
  const files = Array.isArray(input) ? input : Array.from(input?.length !== undefined ? input : [input]).filter(Boolean);
  if (!files.length) {
    closeAttachmentModal();
    return;
  }
  const unsupported = files.find((file) => !getAttachmentKind(file));
  if (unsupported) {
    alert('Можно отправлять фото, видео, голосовые и Office-файлы');
    return;
  }
  openAttachmentModal(files);
}

function stepAttachmentPreview(direction) {
  if (pendingAttachments.length <= 1) return;
  pendingAttachmentIndex = (pendingAttachmentIndex + direction + pendingAttachments.length) % pendingAttachments.length;
  renderPendingAttachmentPreview();
}

function formatAttachmentSize(file) {
  if (!file) return '';
  const mb = file.size / (1024 * 1024);
  const kind = getAttachmentKind(file);
  const label = kind === 'video' ? 'Видео' : kind === 'audio' ? 'Голосовое' : kind === 'document' ? 'Документ' : 'Фото';
  return `${label} · ${mb >= 1 ? mb.toFixed(1) + ' МБ' : Math.max(1, Math.round(file.size / 1024)) + ' КБ'}`;
}

function updateAttachmentSubtitle() {}

async function sendPendingAttachment() {
  if (!pendingAttachments.length || !currentDialogUser || !currentDialogState.canMessage || isUploadingAttachment) return;
  isUploadingAttachment = true;
  if (attachmentSendBtn) attachmentSendBtn.disabled = true;
  if (sendVoiceRecordingBtn) sendVoiceRecordingBtn.disabled = true;
  if (sendBtn) sendBtn.disabled = true;
  const caption = (attachmentCaptionInput?.value || '').trim();

  try {
    for (let index = 0; index < pendingAttachments.length; index += 1) {
      const file = pendingAttachments[index];
      const formData = new FormData();
      formData.append('currentUserId', currentUser.id);
      if (currentDialogUser?.type === 'group') formData.append('groupId', currentDialogUser.rawId || String(currentDialogUser.id).replace(/^group:/, ''));
      else formData.append('recipientId', currentDialogUser.id);
      formData.append('text', index === 0 ? caption : '');
      formData.append('clientMessageId', createClientMessageId('upload'));
      formData.append('file', file);

      const response = await fetch(apiUrl('/api/messages/upload'), {
        method: 'POST',
        body: formData
      });
      await parseApiResponse(response);
    }
    messageInput.value = '';
    closeAttachmentModal();
  } catch (error) {
    alert(error.message || 'Не удалось отправить файл');
    isUploadingAttachment = false;
    if (attachmentSendBtn) attachmentSendBtn.disabled = false;
  } finally {
    if (sendVoiceRecordingBtn) sendVoiceRecordingBtn.disabled = !currentDialogState.canMessage;
    if (sendBtn) sendBtn.disabled = !currentDialogState.canMessage;
  }
}


function renderCurrentUser() {
  currentUserText.textContent = `${currentUser.name} · ${formatPhoneForDisplay(currentUser.phone)}`;
  const nextAvatar = getAvatar(currentUser) || DEFAULT_AVATAR;
  if (currentUserAvatar.dataset.currentSrc !== nextAvatar) {
    currentUserAvatar.src = nextAvatar;
    currentUserAvatar.dataset.currentSrc = nextAvatar;
  }
  currentUserAvatar.onerror = () => {
    currentUserAvatar.onerror = null;
    currentUserAvatar.src = DEFAULT_AVATAR;
    currentUserAvatar.dataset.currentSrc = DEFAULT_AVATAR;
  };
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
  name.title = getDisplayName(user) || user.name || '';
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
  card.addEventListener('click', () => selectDialog(card.dataset.userId));
  return card;
}

function updateUserCard(card, user) {
  card.dataset.userId = user.id;
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
  if (presence) presence.classList.toggle('online', onlineUserIds.has(user.id));
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

  const existingCards = new Map([...userList.querySelectorAll('.user-card')].map((card) => [card.dataset.userId, card]));
  userList.querySelectorAll('.empty-users').forEach((node) => node.remove());

  users.forEach((user, index) => {
    let card = existingCards.get(user.id);
    if (!card) {
      card = createUserCard(user);
    }
    updateUserCard(card, user);
    const expectedNode = userList.children[index];
    if (expectedNode !== card) {
      userList.insertBefore(card, expectedNode || null);
    }
    existingCards.delete(user.id);
  });

  existingCards.forEach((card) => card.remove());
}

function showDialogUI(hasDialog) {
  emptyState.classList.toggle('hidden', hasDialog);
  chat.classList.toggle('hidden', !hasDialog);
  inputArea.classList.toggle('hidden', !hasDialog);
  if (!hasDialog && isRecordingVoice) finishVoiceRecording({ cancel: true });
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


function updateVoiceRecordingComposer() {
  const recordingActive = isRecordingVoice;
  composerTextRow?.classList.toggle('hidden', recordingActive);
  voiceRecordingPanel?.classList.toggle('hidden', !recordingActive);
  if (voiceRecordBtn) voiceRecordBtn.classList.toggle('is-recording', recordingActive);
}

function ensureRecordingWaveBars() {
  if (!voiceRecordingWave || voiceRecordingWave.childElementCount) return;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 34; i += 1) {
    const bar = document.createElement('span');
    bar.className = 'voice-recording-wave-bar';
    bar.style.height = `${18 + (i % 6) * 4}px`;
    fragment.appendChild(bar);
  }
  voiceRecordingWave.appendChild(fragment);
}

function startVoiceRecordingVisualization() {
  ensureRecordingWaveBars();
  updateVoiceRecordingComposer();
  recordingStartedAt = Date.now();
  if (voiceRecordingTime) voiceRecordingTime.textContent = '0:00';
  if (recordingTimerId) clearInterval(recordingTimerId);
  recordingTimerId = window.setInterval(() => {
    if (voiceRecordingTime) voiceRecordingTime.textContent = formatAudioTime((Date.now() - recordingStartedAt) / 1000);
  }, 250);

  const animate = () => {
    const bars = voiceRecordingWave?.querySelectorAll('.voice-recording-wave-bar') || [];
    if (recordingAnalyser && recordingAnalyserData) {
      recordingAnalyser.getByteFrequencyData(recordingAnalyserData);
    }
    bars.forEach((bar, index) => {
      const sample = recordingAnalyserData ? recordingAnalyserData[index % recordingAnalyserData.length] : Math.random() * 255;
      const intensity = sample / 255;
      const height = 8 + Math.round(intensity * 28);
      bar.style.height = `${height}px`;
      bar.classList.toggle('is-live', intensity > 0.18);
      bar.style.opacity = String(0.35 + intensity * 0.85);
    });
    if (isRecordingVoice) recordingAnimationId = requestAnimationFrame(animate);
  };

  if (recordingAnimationId) cancelAnimationFrame(recordingAnimationId);
  recordingAnimationId = requestAnimationFrame(animate);
}

function stopVoiceRecordingVisualization() {
  updateVoiceRecordingComposer();
  if (recordingTimerId) clearInterval(recordingTimerId);
  recordingTimerId = null;
  if (recordingAnimationId) cancelAnimationFrame(recordingAnimationId);
  recordingAnimationId = null;
  if (voiceRecordingTime) voiceRecordingTime.textContent = '0:00';
  voiceRecordingWave?.querySelectorAll('.voice-recording-wave-bar').forEach((bar, index) => {
    bar.classList.remove('is-live');
    bar.style.height = `${14 + (index % 5) * 3}px`;
    bar.style.opacity = '0.75';
  });
  voiceRecordingPanel?.style.removeProperty('opacity');
  voiceRecordingPanel?.style.removeProperty('transform');
  voiceRecordingPanel?.style.removeProperty('filter');
  voiceRecordingSwipeHint?.classList.remove('is-canceling');
  voiceRecordingShell?.classList.remove('is-dragging', 'is-canceling');
  if (recordingSourceNode) {
    try { recordingSourceNode.disconnect(); } catch {}
    recordingSourceNode = null;
  }
  if (recordingAnalyser) {
    try { recordingAnalyser.disconnect(); } catch {}
    recordingAnalyser = null;
  }
  recordingAnalyserData = null;
  if (recordingAudioContext) {
    recordingAudioContext.close().catch(() => {});
    recordingAudioContext = null;
  }
}


function bindVoiceRecordingSwipe() {
  if (!voiceRecordingShell) return;

  const threshold = 120;

  const updateDrag = (deltaX) => {
    const clamped = Math.min(0, deltaX);
    const progress = Math.min(1, Math.abs(clamped) / threshold);
    voiceRecordingShell.classList.add('is-dragging');
    voiceRecordingShell.classList.toggle('is-canceling', progress > 0.72);
    voiceRecordingSwipeHint?.classList.toggle('is-canceling', progress > 0.72);
    voiceRecordingShell.style.transform = `translateX(${clamped}px)`;
    voiceRecordingShell.style.opacity = String(1 - progress * 0.28);
    voiceRecordingShell.style.filter = `saturate(${1 - progress * 0.2})`;
  };

  const endDrag = async (cancelledByThreshold = false) => {
    if (!recordingDragState) return;
    const shouldCancel = cancelledByThreshold || (recordingDragState.deltaX <= -threshold);
    recordingDragState = null;
    voiceRecordingShell.classList.remove('is-dragging');
    if (shouldCancel) {
      await finishVoiceRecording({ cancel: true });
      return;
    }
    voiceRecordingShell.classList.remove('is-canceling');
    voiceRecordingSwipeHint?.classList.remove('is-canceling');
    voiceRecordingShell.style.transform = 'translateX(0px)';
    voiceRecordingShell.style.opacity = '1';
    voiceRecordingShell.style.filter = 'none';
  };

  voiceRecordingShell.addEventListener('pointerdown', (event) => {
    if (!isRecordingVoice) return;
    recordingDragState = { pointerId: event.pointerId, startX: event.clientX, deltaX: 0 };
    voiceRecordingShell.setPointerCapture?.(event.pointerId);
  });

  voiceRecordingShell.addEventListener('pointermove', (event) => {
    if (!recordingDragState || recordingDragState.pointerId !== event.pointerId) return;
    recordingDragState.deltaX = event.clientX - recordingDragState.startX;
    updateDrag(recordingDragState.deltaX);
  });

  const finishPointerDrag = (event) => {
    if (!recordingDragState || recordingDragState.pointerId !== event.pointerId) return;
    endDrag(false);
  };

  voiceRecordingShell.addEventListener('pointerup', finishPointerDrag);
  voiceRecordingShell.addEventListener('pointercancel', finishPointerDrag);
}

async function markVoiceMessageListened(messageId) {
  if (!currentUser?.id || !messageId) return;
  try {
    const response = await fetch(apiUrl(`/api/messages/${messageId}/listen`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUserId: currentUser.id })
    });
    const data = await parseApiResponse(response);
    if (data?.message) upsertMessage(data.message);
  } catch (error) {
    console.error('voice listen status error', error);
  }
}

async function finishVoiceRecording({ cancel = false, send = false } = {}) {
  if (isFinishingVoiceRecording) {
    if (send && !cancel) pendingVoiceSendOnStop = true;
    return;
  }
  pendingVoiceSendOnStop = Boolean(send && !cancel);
  if (!isRecordingVoice) {
    pendingVoiceSendOnStop = false;
    return;
  }
  isFinishingVoiceRecording = true;
  if (cancel) recordedChunks = [];
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  else isFinishingVoiceRecording = false;
}

function formatAudioTime(totalSeconds) {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function buildWaveBars(seedValue, count = 42) {
  const bars = [];
  let seed = 0;
  const raw = String(seedValue || Date.now());
  for (let i = 0; i < raw.length; i += 1) seed = (seed * 31 + raw.charCodeAt(i)) % 2147483647;
  for (let i = 0; i < count; i += 1) {
    seed = (seed * 48271) % 2147483647;
    const height = 20 + (seed % 70);
    bars.push(`<span class="voice-wave-bar" style="height:${height}%"></span>`);
  }
  return bars.join('');
}

function createVoiceMessageNode(message, attachmentUrl, isMe) {
  const wrap = document.createElement('div');
  wrap.className = `voice-message ${isMe ? 'me' : 'other'}`;

  const shouldTrackUnheard = Boolean(message?.attachmentType === 'audio');
  let listenedMarked = Boolean(message?.audioListened);

  const audio = document.createElement('audio');
  audio.className = 'voice-audio-native';
  audio.src = attachmentUrl;
  audio.preload = 'metadata';

  const playBtn = document.createElement('button');
  playBtn.className = 'voice-play-btn';
  playBtn.type = 'button';
  playBtn.setAttribute('aria-label', 'Воспроизвести голосовое сообщение');
  playBtn.innerHTML = '<span class="voice-play-icon"></span>';

  const body = document.createElement('div');
  body.className = 'voice-body';

  const wave = document.createElement('div');
  wave.className = 'voice-wave';
  wave.innerHTML = buildWaveBars(message.id || message.createdAt || attachmentUrl);

  const info = document.createElement('div');
  info.className = 'voice-info';

  const duration = document.createElement('span');
  duration.className = 'voice-duration';
  duration.textContent = '0:00';

  const dot = document.createElement('span');
  dot.className = `voice-dot ${!listenedMarked && shouldTrackUnheard ? 'is-unheard' : ''}`;

  const metaGroup = document.createElement('span');
  metaGroup.className = 'voice-meta-group';
  metaGroup.append(duration, dot);
  info.append(metaGroup);
  body.append(wave, info);
  wrap.append(playBtn, body, audio);

  let rafId = null;
  function refreshBars() {
    const bars = wave.querySelectorAll('.voice-wave-bar');
    const progress = audio.duration ? (audio.currentTime / audio.duration) : 0;
    const activeCount = Math.round(bars.length * progress);
    bars.forEach((bar, index) => bar.classList.toggle('is-active', index < activeCount));
    duration.textContent = formatAudioTime(audio.currentTime || audio.duration || 0);
    if (!audio.paused && !audio.ended) rafId = requestAnimationFrame(refreshBars);
  }

  function syncState() {
    wrap.classList.toggle('is-playing', !audio.paused && !audio.ended);
    if (audio.paused || audio.ended) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      refreshBars();
    }
    if (audio.ended) {
      duration.textContent = formatAudioTime(audio.duration || 0);
    }
  }

  audio.addEventListener('loadedmetadata', () => {
    duration.textContent = formatAudioTime(audio.duration || 0);
  });
  audio.addEventListener('play', async () => {
    syncState();
    if (shouldTrackUnheard && !listenedMarked) {
      listenedMarked = true;
      dot.classList.remove('is-unheard');
      markVoiceMessageListened(message.id);
    }
  });
  audio.addEventListener('pause', syncState);
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    syncState();
    refreshBars();
    duration.textContent = formatAudioTime(audio.duration || 0);
  });
  audio.addEventListener('timeupdate', () => {
    if (audio.paused) refreshBars();
  });

  playBtn.addEventListener('click', async () => {
    try {
      const playingAudios = document.querySelectorAll('.voice-audio-native');
      playingAudios.forEach((node) => {
        if (node !== audio) node.pause();
      });
      if (audio.paused) await audio.play();
      else audio.pause();
      syncState();
    } catch (error) {
      console.error('Voice playback error', error);
    }
  });

  refreshBars();
  return wrap;
}


function createDocumentAttachmentNode(message, attachmentUrl) {
  const link = document.createElement('a');
  link.className = 'message-file-card';
  link.href = attachmentUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.innerHTML = `<span class="message-file-icon">${getDocumentLabel(message.attachmentName || '')}</span><span class="message-file-meta"><strong>${message.attachmentName || 'Файл'}</strong><small>Нажмите, чтобы открыть</small></span>`;
  return link;
}

function createAvatarSuggestionNode(message, attachmentUrl, isMe) {
  const wrap = document.createElement('div');
  wrap.className = 'avatar-suggestion-card';
  const img = document.createElement('img');
  img.className = 'avatar-suggestion-image';
  img.src = attachmentUrl;
  img.alt = message.attachmentName || 'Предложенная аватарка';
  img.loading = 'lazy';
  wrap.appendChild(img);
  const note = document.createElement('div');
  note.className = 'avatar-suggestion-note';
  note.textContent = isMe ? 'Вы предложили эту фотографию как аватарку.' : 'Собеседник предлагает поставить эту фотографию на аватарку.';
  wrap.appendChild(note);
  const status = document.createElement('div');
  status.className = 'avatar-suggestion-status';
  const state = message.avatarSuggestionStatus || 'pending';
  status.textContent = state === 'accepted' ? 'Аватарка установлена' : state === 'declined' ? 'Предложение отклонено' : 'Ожидает ответа';
  wrap.appendChild(status);
  if (!isMe && message.avatarSuggestionTargetUserId === currentUser?.id && state === 'pending') {
    const actions = document.createElement('div');
    actions.className = 'avatar-suggestion-actions';
    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.className = 'primary-btn avatar-suggestion-btn';
    acceptBtn.textContent = 'Поставить аватарку';
    acceptBtn.addEventListener('click', async () => {
      acceptBtn.disabled = true;
      declineBtn.disabled = true;
      try {
        const response = await fetch(apiUrl(`/api/messages/${encodeURIComponent(message.id)}/avatar-suggestion-response`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentUserId: currentUser.id, action: 'accept' })
        });
        await parseApiResponse(response);
      } catch (error) {
        alert(error.message || 'Не удалось установить аватарку');
        acceptBtn.disabled = false;
        declineBtn.disabled = false;
      }
    });
    const declineBtn = document.createElement('button');
    declineBtn.type = 'button';
    declineBtn.className = 'ghost-btn avatar-suggestion-btn';
    declineBtn.textContent = 'Отклонить';
    declineBtn.addEventListener('click', async () => {
      acceptBtn.disabled = true;
      declineBtn.disabled = true;
      try {
        const response = await fetch(apiUrl(`/api/messages/${encodeURIComponent(message.id)}/avatar-suggestion-response`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentUserId: currentUser.id, action: 'decline' })
        });
        await parseApiResponse(response);
      } catch (error) {
        alert(error.message || 'Не удалось отклонить предложение');
        acceptBtn.disabled = false;
        declineBtn.disabled = false;
      }
    });
    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);
    wrap.appendChild(actions);
  }
  return wrap;
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
      mediaNode.addEventListener('click', () => openMediaViewer(attachmentUrl, 'image', message.attachmentName || 'Фото'));
    } else if (message.attachmentType === 'video') {
      mediaNode = document.createElement('video');
      mediaNode.className = 'dialog-video dialog-media-clickable';
      mediaNode.src = attachmentUrl;
      mediaNode.controls = true;
      mediaNode.preload = 'metadata';
      mediaNode.addEventListener('click', (event) => {
        if (event.target === mediaNode) {
          event.preventDefault();
          openMediaViewer(attachmentUrl, 'video', message.attachmentName || 'Видео');
        }
      });
    } else if (message.attachmentType === 'audio') {
      mediaNode = createVoiceMessageNode(message, attachmentUrl, isMe);
    } else if (message.attachmentType === 'document') {
      mediaNode = createDocumentAttachmentNode(message, attachmentUrl);
    } else if (message.attachmentType === 'avatar_suggestion') {
      mediaNode = createAvatarSuggestionNode(message, attachmentUrl, isMe);
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

  if (message.isGroup || !isMe) node.appendChild(sender);
  if (content.textContent || message.deletedAt) node.appendChild(content);
  if (mediaNode) node.appendChild(mediaNode);

  if (isMe && !message.deletedAt && !message.isGroup) {
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
  if (!message?.id) return;
  const exists = currentDialogMessages.some((item) => item.id === message.id) || Boolean(chat.querySelector(`.message[data-id="${message.id}"]`));
  if (exists) {
    upsertMessage(message);
    return;
  }
  currentDialogMessages.push(message);
  chat.appendChild(createMessageNode(message));
  scrollChatToBottom();
}

function upsertMessage(message) {
  const index = currentDialogMessages.findIndex((item) => item.id === message.id);
  if (index >= 0) currentDialogMessages[index] = message;
  else currentDialogMessages.push(message);
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
    if (contactBlockToggleBtn) contactBlockToggleBtn.classList.add('hidden');
    if (voiceRecordBtn) voiceRecordBtn.disabled = false;
    if (cancelVoiceRecordingBtn) cancelVoiceRecordingBtn.disabled = false;
    if (sendVoiceRecordingBtn) sendVoiceRecordingBtn.disabled = false;
    chatStatusBanner.classList.add('hidden');
    chatStatusBanner.textContent = '';
    inputArea.classList.remove('disabled');
    messageInput.disabled = false;
    sendBtn.disabled = false;
    return;
  }

  if (contactBlockToggleBtn) {
    contactBlockToggleBtn.classList.toggle('hidden', currentDialogUser.type === 'group');
    contactBlockToggleBtn.textContent = currentDialogState.isBlocked ? 'Убрать из чёрного списка' : 'В чёрный список';
  }

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
  if (voiceRecordBtn) voiceRecordBtn.disabled = !currentDialogState.canMessage || isRecordingVoice;
  if (cancelVoiceRecordingBtn) cancelVoiceRecordingBtn.disabled = !currentDialogState.canMessage;
  if (sendVoiceRecordingBtn) sendVoiceRecordingBtn.disabled = !currentDialogState.canMessage;
  if (!editingMessageId) {
    messageInput.placeholder = currentDialogState.canMessage ? 'Введите сообщение...' : 'Отправка сообщений недоступна';
  }
}

async function loadUsers() {
  const search = searchInput.value.trim();
  const [usersResponse, groupsResponse] = await Promise.all([
    fetch(apiUrl(`/api/users?currentUserId=${encodeURIComponent(currentUser.id)}&search=${encodeURIComponent(search)}`)),
    fetch(apiUrl(`/api/groups?currentUserId=${encodeURIComponent(currentUser.id)}`))
  ]);
  const [data, groupsData] = await Promise.all([usersResponse.json(), groupsResponse.json()]);
  const groups = (groupsData.groups || []).filter((group) => !search || getDisplayName(group).toLowerCase().includes(search.toLowerCase()));
  users = [...(groups || []), ...(data.users || [])].sort((a, b) => {
    const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at || getDisplayName(a).localeCompare(getDisplayName(b), 'ru');
  });

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
  lastSeenMap = data.lastSeenMap || {};
  users = users.map((item) => item.type === 'group' ? item : { ...item, lastSeenAt: lastSeenMap[String(item.id)] || item.lastSeenAt || null });
  renderUsers();
}

function updateDialogHeader() {
  if (!currentDialogUser) {
    dialogTitle.textContent = 'Выберите собеседника';
    dialogSubtitle.textContent = 'Личные сообщения в реальном времени';
    updateDialogProfileTriggerState();
    backToDialogsBtn.classList.add('hidden');
    return;
  }

  dialogTitle.textContent = getDisplayName(currentDialogUser);
  updateDialogProfileTriggerState();
  addGroupMembersBtn?.classList.toggle('hidden', currentDialogUser.type !== 'group');
  if (currentDialogUser.type === 'group') {
    const count = Array.isArray(currentDialogUser.memberIds) ? currentDialogUser.memberIds.length : 0;
    dialogSubtitle.textContent = count > 0 ? `${count} участников` : 'Групповая беседа';
  } else {
    const phoneText = currentDialogUser.phone ? currentDialogUser.phone : 'Номер скрыт';
    dialogSubtitle.textContent = onlineUserIds.has(currentDialogUser.id) ? `${phoneText} · онлайн` : `${phoneText} · был(а) в сети ${formatLastSeen(currentDialogUser.lastSeenAt || lastSeenMap[String(currentDialogUser.id)] || null)}`;
  }
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

  const response = await fetch(currentDialogUser.type === 'group'
    ? apiUrl(`/api/groups/${encodeURIComponent(currentDialogUser.rawId || String(userId).replace(/^group:/, ''))}/messages?currentUserId=${encodeURIComponent(currentUser.id)}`)
    : apiUrl(`/api/messages/${userId}?currentUserId=${encodeURIComponent(currentUser.id)}`));
  const data = await response.json();

  currentDialogState = {
    canMessage: data.canMessage !== false,
    isBlocked: Boolean(data.isBlocked),
    blockedByUser: Boolean(data.blockedByUser)
  };

  chat.innerHTML = '';
  shouldStickToBottom = true;
  currentDialogMessages = [];
  currentDialogMessages = data.messages || [];
  currentDialogMessages.forEach((message) => {
    chat.appendChild(createMessageNode(message));
  });
  scrollChatToBottom(true);
  applyDialogRestrictions();
  renderUsers();
  updateDialogHeader();

  if (socket) {
    if (currentDialogUser.type === 'group') socket.emit('open-dialog', { currentUserId: currentUser.id, groupId: currentDialogUser.rawId || String(userId).replace(/^group:/, '') });
    else socket.emit('open-dialog', { currentUserId: currentUser.id, otherUserId: userId });
  }

  await loadUsers();
}

function exitDialog() {
  currentDialogUser = null;
  currentDialogProfile = null;
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

  socket.on('presence:update', ({ userId, isOnline, lastSeenAt }) => {
    if (isOnline) {
      onlineUserIds.add(userId);
      lastSeenMap[String(userId)] = null;
    } else {
      onlineUserIds.delete(userId);
      lastSeenMap[String(userId)] = lastSeenAt || new Date().toISOString();
    }
    users = users.map((item) => item.type === 'group' ? item : (String(item.id) === String(userId) ? { ...item, lastSeenAt: lastSeenMap[String(userId)] || null } : item));
    if (currentDialogUser && String(currentDialogUser.id) === String(userId)) currentDialogUser = { ...currentDialogUser, lastSeenAt: lastSeenMap[String(userId)] || null };
    if (currentDialogProfile && String(currentDialogProfile.id) === String(userId)) currentDialogProfile = { ...currentDialogProfile, lastSeenAt: lastSeenMap[String(userId)] || null };
    renderUsers();
    updateDialogHeader();
    if (!contactProfileModal.classList.contains('hidden') && currentDialogProfile && String(currentDialogProfile.id) === String(userId)) {
      if (contactProfileStatus) contactProfileStatus.textContent = getPresenceText(currentDialogProfile);
      if (contactProfileLastSeen) contactProfileLastSeen.textContent = isOnline ? 'Сейчас в сети' : formatLastSeen(lastSeenMap[String(userId)] || null);
    }
  });

  socket.on('private-message', async (message) => {
    const isCurrentDialog = currentDialogUser && (currentDialogUser.type === 'group'
      ? message.groupId && message.groupId === (currentDialogUser.rawId || String(currentDialogUser.id).replace(/^group:/, ''))
      : message.dialogId === [currentUser.id, currentDialogUser.id].sort().join(':'));
    if (isCurrentDialog) {
      addMessage(message);
      if (currentDialogUser.type === 'group') socket.emit('open-dialog', { currentUserId: currentUser.id, groupId: currentDialogUser.rawId || String(currentDialogUser.id).replace(/^group:/, '') });
      else socket.emit('open-dialog', { currentUserId: currentUser.id, otherUserId: currentDialogUser.id });
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

  socket.on('message:audio-listened', ({ messageId, userId, message }) => {
    if (message) {
      upsertMessage(message);
      return;
    }
    if (!messageId) return;
    const index = currentDialogMessages.findIndex((item) => item.id === messageId);
    if (index >= 0) {
      currentDialogMessages[index] = { ...currentDialogMessages[index], audioListened: true };
      upsertMessage(currentDialogMessages[index]);
    }
  });

  socket.on('message:deleted', async (message) => {
    upsertMessage(message);
    await loadUsers();
    if (editingMessageId === message.id) resetEditingState();
  });


  socket.on('group:updated', async (group) => {
    if (!group) return;
    const existingIndex = users.findIndex((item) => item.id === group.id);
    if (existingIndex >= 0) users[existingIndex] = { ...users[existingIndex], ...group };
    else users.unshift(group);
    renderUsers();
    await loadUsers();
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


async function fetchEligibleGroupUsers(groupId = '') {
  const endpoint = groupId
    ? `/api/groups/${encodeURIComponent(groupId)}/eligible-users?currentUserId=${encodeURIComponent(currentUser.id)}`
    : `/api/groups/eligible-users?currentUserId=${encodeURIComponent(currentUser.id)}`;
  const response = await fetch(apiUrl(endpoint));
  const data = await parseApiResponse(response);
  return data.users || [];
}

async function renderGroupMembers() {
  if (!groupMembersList) return;
  groupMembersList.innerHTML = '';
  const candidates = await fetchEligibleGroupUsers(groupModalState.mode === 'add' ? groupModalState.groupId : '');
  if (!candidates.length) {
    groupMembersList.innerHTML = `<div class="blacklist-empty">${groupModalState.mode === 'add' ? 'Нет пользователей, которых можно добавить в эту беседу.' : 'Нет доступных пользователей. Создать беседу можно только с теми, с кем у вас уже есть диалог.'}</div>`;
    return;
  }
  candidates.forEach((user) => {
    const label = document.createElement('label');
    label.className = 'group-member-option';
    label.innerHTML = `
      <input type="checkbox" value="${user.id}" />
      ${getAvatarImgMarkup(user, 'profile-avatar', 'avatar')}
      <div class="group-member-meta">
        <div class="group-member-name">${getDisplayName(user)}</div>
        <div class="group-member-phone">${user.phone || 'Номер скрыт'}</div>
      </div>
    `;
    groupMembersList.appendChild(label);
  });
}

async function openGroupModal() {
  if (!groupModal) return;
  groupModalState.mode = 'create';
  groupModalState.groupId = '';
  groupNameInput.value = '';
  if (groupModalTitle) groupModalTitle.textContent = 'Создать беседу';
  if (saveGroupBtn) saveGroupBtn.textContent = 'Создать';
  if (groupNameWrap) groupNameWrap.classList.remove('hidden');
  groupModal.classList.remove('hidden');
  await renderGroupMembers();
}

async function openAddMembersModal() {
  if (!groupModal || !currentDialogUser || currentDialogUser.type !== 'group') return;
  groupModalState.mode = 'add';
  groupModalState.groupId = currentDialogUser.rawId || String(currentDialogUser.id).replace(/^group:/, '');
  groupNameInput.value = currentDialogUser.name || '';
  if (groupModalTitle) groupModalTitle.textContent = 'Добавить участников';
  if (saveGroupBtn) saveGroupBtn.textContent = 'Добавить';
  if (groupNameWrap) groupNameWrap.classList.add('hidden');
  groupModal.classList.remove('hidden');
  await renderGroupMembers();
}

function closeGroupModal() {
  if (!groupModal) return;
  groupModal.classList.add('hidden');
  groupModalState.mode = 'create';
  groupModalState.groupId = '';
  if (groupNameWrap) groupNameWrap.classList.remove('hidden');
}

async function saveGroup() {
  const memberIds = [...groupMembersList.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  if (!memberIds.length) {
    alert('Выберите хотя бы одного участника');
    return;
  }
  try {
    if (groupModalState.mode === 'add') {
      const response = await fetch(apiUrl(`/api/groups/${encodeURIComponent(groupModalState.groupId)}/members`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: currentUser.id, memberIds })
      });
      const data = await parseApiResponse(response);
      closeGroupModal();
      await loadUsers();
      if (data.group?.id) {
        const existing = users.find((item) => item.id === data.group.id);
        if (existing) currentDialogUser = existing;
        await selectDialog(data.group.id);
      }
      return;
    }

    const name = groupNameInput?.value?.trim() || '';
    const response = await fetch(apiUrl('/api/groups'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUserId: currentUser.id, name, memberIds })
    });
    const data = await parseApiResponse(response);
    closeGroupModal();
    await loadUsers();
    if (data.group?.id) await selectDialog(data.group.id);
  } catch (error) {
    alert(error.message || (groupModalState.mode === 'add' ? 'Не удалось добавить участников' : 'Не удалось создать беседу'));
  }
}

async function sendAvatarSuggestion(file) {
  if (!file || !currentDialogUser || currentDialogUser.type === 'group') return;
  if (!String(file.type || '').startsWith('image/')) {
    alert('Для предложения аватарки можно выбрать только изображение');
    return;
  }
  try {
    const formData = new FormData();
    formData.append('currentUserId', currentUser.id);
    formData.append('recipientId', currentDialogUser.id);
    formData.append('clientMessageId', createClientMessageId('avatar_suggestion'));
    formData.append('photo', file);
    const response = await fetch(apiUrl('/api/messages/avatar-suggestion'), {
      method: 'POST',
      body: formData
    });
    await parseApiResponse(response);
  } catch (error) {
    alert(error.message || 'Не удалось отправить предложение аватарки');
  } finally {
    if (avatarSuggestionInput) avatarSuggestionInput.value = '';
  }
}

async function toggleVoiceRecording() {
  if (isRecordingVoice) {
    await finishVoiceRecording({ send: false });
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    alert('Ваш браузер не поддерживает запись голосовых сообщений');
    return;
  }
  try {
    mediaRecorderStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    pendingVoiceSendOnStop = false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      recordingAudioContext = new AudioContextClass();
      recordingSourceNode = recordingAudioContext.createMediaStreamSource(mediaRecorderStream);
      recordingAnalyser = recordingAudioContext.createAnalyser();
      recordingAnalyser.fftSize = 128;
      recordingAnalyser.smoothingTimeConstant = 0.82;
      recordingSourceNode.connect(recordingAnalyser);
      recordingAnalyserData = new Uint8Array(recordingAnalyser.frequencyBinCount);
    }
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    mediaRecorder = new MediaRecorder(mediaRecorderStream, { mimeType });
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) recordedChunks.push(event.data);
    };
    mediaRecorder.onstop = async () => {
      const shouldSend = pendingVoiceSendOnStop;
      pendingVoiceSendOnStop = false;
      isRecordingVoice = false;
      isFinishingVoiceRecording = false;
      stopVoiceRecordingVisualization();
      mediaRecorderStream?.getTracks?.().forEach((track) => track.stop());
      mediaRecorderStream = null;

      const hasAudio = recordedChunks.some((chunk) => chunk.size > 0);
      if (!hasAudio) {
        recordedChunks = [];
        return;
      }

      const blob = new Blob(recordedChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
      recordedChunks = [];
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
      if (shouldSend) {
        pendingAttachments = [file];
        pendingAttachmentIndex = 0;
        requestAnimationFrame(() => sendPendingAttachment());
      } else {
        setPendingAttachment(file);
      }
    };
    mediaRecorder.start();
    isRecordingVoice = true;
    startVoiceRecordingVisualization();
  } catch (error) {
    alert('Не удалось получить доступ к микрофону');
  }
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
  closeGroupModal();
  showDialogUI(false);
  showScreen(authScreen);
}

async function submitMessage() {
  const text = messageInput.value.trim();
  if (!currentDialogUser || !currentDialogState.canMessage || isSubmittingTextMessage) return;

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

  if (isRecordingVoice) {
    await finishVoiceRecording({ send: true });
    return;
  }

  if (pendingAttachments.length) {
    await sendPendingAttachment();
    return;
  }

  if (!text || !socket) return;
  isSubmittingTextMessage = true;
  if (sendBtn) sendBtn.disabled = true;
  try {
    const clientMessageId = createClientMessageId('text');
    if (currentDialogUser.type === 'group') socket.emit('send-group-message', { text, groupId: currentDialogUser.rawId || String(currentDialogUser.id).replace(/^group:/, ''), clientMessageId });
    else socket.emit('send-private-message', { text, recipientId: currentDialogUser.id, clientMessageId });
    messageInput.value = '';
    messageInput.focus();
    setTimeout(() => {
      isSubmittingTextMessage = false;
      if (sendBtn) sendBtn.disabled = !currentDialogState.canMessage;
    }, 350);
  } catch (error) {
    isSubmittingTextMessage = false;
    if (sendBtn) sendBtn.disabled = !currentDialogState.canMessage;
    throw error;
  }
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
  if (!currentDialogUser || currentDialogUser.type === 'group') return;
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
  closeGroupModal();
    await loadUsers();
  } catch (error) {
    alert(error.message || 'Не удалось сохранить профиль');
  }
}

async function toggleBlockUser() {
  if (!currentDialogUser || currentDialogUser.type === 'group') return;

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
  if (contactBlockToggleBtn && !contactProfileModal?.classList.contains('hidden') && currentDialogUser?.type !== 'group') {
    contactBlockToggleBtn.textContent = currentDialogState.isBlocked ? 'Убрать из чёрного списка' : 'В чёрный список';
  }
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
  if (contactBlockToggleBtn && !contactProfileModal?.classList.contains('hidden') && currentDialogUser?.type !== 'group') {
    contactBlockToggleBtn.textContent = currentDialogState.isBlocked ? 'Убрать из чёрного списка' : 'В чёрный список';
  }
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
if (dialogProfileTrigger) dialogProfileTrigger.addEventListener('click', openContactProfile);
closeProfileBtn.addEventListener('click', closeProfileModal);
if (closeContactProfileBtn) closeContactProfileBtn.addEventListener('click', closeContactProfile);
saveProfileBtn.addEventListener('click', saveProfile);
logoutBtn.addEventListener('click', logout);
backToDialogsBtn.addEventListener('click', exitDialog);
if (contactBlockToggleBtn) contactBlockToggleBtn.addEventListener('click', toggleBlockUser);
if (contactRenameDialogBtn) contactRenameDialogBtn.addEventListener('click', renameCurrentDialogUser);

if (messageAttachBtn) {
  messageAttachBtn.addEventListener('click', () => messageAttachmentInput.click());
}
if (contactSuggestAvatarBtn) {
  contactSuggestAvatarBtn.addEventListener('click', () => avatarSuggestionInput?.click());
}
if (avatarSuggestionInput) {
  avatarSuggestionInput.addEventListener('change', () => {
    const file = avatarSuggestionInput.files?.[0];
    if (file) sendAvatarSuggestion(file);
  });
}
if (voiceRecordBtn) {
  voiceRecordBtn.addEventListener('click', toggleVoiceRecording);
}
if (cancelVoiceRecordingBtn) {
  cancelVoiceRecordingBtn.addEventListener('click', () => finishVoiceRecording({ cancel: true }));
}
if (sendVoiceRecordingBtn) {
  sendVoiceRecordingBtn.addEventListener('click', () => finishVoiceRecording({ send: true }));
}
if (createGroupBtn) createGroupBtn.addEventListener('click', openGroupModal);
if (addGroupMembersBtn) addGroupMembersBtn.addEventListener('click', openAddMembersModal);
if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', closeGroupModal);
if (saveGroupBtn) saveGroupBtn.addEventListener('click', saveGroup);
bindVoiceRecordingSwipe();
if (groupModal) groupModal.addEventListener('click', (event) => { if (event.target === groupModal) closeGroupModal(); });

if (messageAttachmentInput) {
  messageAttachmentInput.addEventListener('change', () => {
    const files = Array.from(messageAttachmentInput.files || []);
    if (!files.length) return;
    if (!pendingAttachments.length || attachmentModal.classList.contains('hidden')) setPendingAttachment(files);
    else setPendingAttachment([...pendingAttachments, ...files]);
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
  if (event.key === 'Escape' && mediaViewerModal && !mediaViewerModal.classList.contains('hidden')) {
    closeMediaViewer();
  }
});

if (attachmentCancelBtn) attachmentCancelBtn.addEventListener('click', closeAttachmentModal);
if (attachmentChooseAnotherBtn) attachmentChooseAnotherBtn.addEventListener('click', () => messageAttachmentInput && messageAttachmentInput.click());
if (attachmentSendBtn) attachmentSendBtn.addEventListener('click', sendPendingAttachment);

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
        const file = event.dataTransfer?.files?.[0];
        if (file && currentDialogUser && currentDialogState.canMessage) {
          setPendingAttachment(file);
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


if (contactProfileAvatar) {
  contactProfileAvatar.addEventListener('click', () => {
    const profileUser = currentDialogProfile || currentDialogUser;
    if (!profileUser) return;
    const avatar = getAvatar(profileUser) || DEFAULT_AVATAR;
    mediaViewerItems = [{ url: avatar, type: 'image', name: `${getDisplayName(profileUser)} — аватарка` }];
    mediaViewerIndex = 0;
    renderMediaViewerItem();
    mediaViewerModal.classList.remove('hidden');
  });
}

if (changeGroupPhotoBtn) {
  changeGroupPhotoBtn.addEventListener('click', () => groupPhotoInput?.click());
}

if (groupPhotoInput) {
  groupPhotoInput.addEventListener('change', async () => {
    const file = groupPhotoInput.files?.[0];
    if (!file) return;
    try {
      await uploadGroupPhoto(file);
    } catch (error) {
      alert(error.message || 'Не удалось обновить фото беседы');
    } finally {
      groupPhotoInput.value = '';
    }
  });
}


async function uploadGroupPhoto(file) {
  if (!file || !currentDialogUser || currentDialogUser.type !== 'group') return;
  const formData = new FormData();
  formData.append('currentUserId', currentUser.id);
  formData.append('photo', file);
  const response = await fetch(apiUrl(`/api/groups/${encodeURIComponent(currentDialogUser.rawId || String(currentDialogUser.id).replace(/^group:/, ''))}/photo`), {
    method: 'POST',
    body: formData
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Не удалось обновить фото беседы');
  if (data.group) {
    users = users.map((item) => item.id === data.group.id ? { ...item, ...data.group } : item);
    currentDialogUser = { ...currentDialogUser, ...data.group };
    currentDialogProfile = { ...(currentDialogProfile || currentDialogUser), ...data.group };
    updateDialogHeader();
    renderUsers();
    if (contactProfileAvatar) {
      contactProfileAvatar.src = getAvatar(currentDialogUser) || DEFAULT_AVATAR;
      contactProfileAvatar.onerror = () => { contactProfileAvatar.onerror = null; contactProfileAvatar.src = DEFAULT_AVATAR; };
    }
  }
}

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

if (contactProfileModal) {
  contactProfileModal.addEventListener('click', (event) => {
    if (event.target === contactProfileModal) closeContactProfile();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!profileModal.classList.contains('hidden')) {
    closeProfileModal();
    return;
  }
  if (contactProfileModal && !contactProfileModal.classList.contains('hidden')) {
    closeContactProfile();
    return;
  }
  if (!groupModal.classList.contains('hidden')) {
    closeGroupModal();
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
if (attachmentModalPrevBtn) attachmentModalPrevBtn.addEventListener('click', () => stepAttachmentPreview(-1));
if (attachmentModalNextBtn) attachmentModalNextBtn.addEventListener('click', () => stepAttachmentPreview(1));
if (mediaViewerPrevBtn) mediaViewerPrevBtn.addEventListener('click', () => stepMediaViewer(-1));
if (mediaViewerNextBtn) mediaViewerNextBtn.addEventListener('click', () => stepMediaViewer(1));
document.addEventListener('keydown', (event) => {
  if (!attachmentModal?.classList.contains('hidden')) {
    if (event.key === 'ArrowLeft') stepAttachmentPreview(-1);
    if (event.key === 'ArrowRight') stepAttachmentPreview(1);
  }
  if (!mediaViewerModal?.classList.contains('hidden')) {
    if (event.key === 'ArrowLeft') stepMediaViewer(-1);
    if (event.key === 'ArrowRight') stepMediaViewer(1);
    if (event.key === 'Escape') closeMediaViewer();
  }
});

