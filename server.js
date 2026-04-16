const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

function ensureFile(filePath, fallback) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
  }
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

ensureFile(USERS_FILE, []);
ensureFile(MESSAGES_FILE, []);

function readJson(filePath, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function normalizePhone(phone = '') {
  return String(phone).replace(/[^\d+]/g, '');
}

function isValidPhone(phone) {
  const normalized = normalizePhone(phone);
  return normalized.length >= 10;
}

function makeDialogId(userA, userB) {
  return [String(userA), String(userB)].sort().join(':');
}

function enrichUser(user) {
  return {
    ...user,
    photo: user.photo || '',
    showPhone: user.showPhone !== false,
    blockedUserIds: Array.isArray(user.blockedUserIds) ? user.blockedUserIds.map(String) : []
  };
}

function enrichMessage(message) {
  return {
    ...message,
    editedAt: message.editedAt || null,
    deletedAt: message.deletedAt || null
  };
}

function publicUser(user, viewerId = null) {
  const safeUser = enrichUser(user);
  const isSelf = viewerId && String(viewerId) === safeUser.id;

  return {
    id: safeUser.id,
    name: safeUser.name,
    phone: (isSelf || safeUser.showPhone) ? safeUser.phone : '',
    phoneHidden: !isSelf && !safeUser.showPhone,
    showPhone: safeUser.showPhone,
    photo: safeUser.photo || '',
    blockedUserIds: isSelf ? safeUser.blockedUserIds : undefined
  };
}

function getUsersMap() {
  return readJson(USERS_FILE, []).map(enrichUser);
}

function getMessages() {
  return readJson(MESSAGES_FILE, []).map(enrichMessage);
}

function areUsersBlocked(userA, userB) {
  const left = enrichUser(userA);
  const right = enrichUser(userB);
  return left.blockedUserIds.includes(right.id) || right.blockedUserIds.includes(left.id);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({ storage });

app.use(cors({
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean),
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/register', (req, res) => {
  const { phone, password, name } = req.body || {};
  const normalizedPhone = normalizePhone(phone || '');

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Имя должно содержать минимум 2 символа' });
  }

  if (!isValidPhone(normalizedPhone)) {
    return res.status(400).json({ error: 'Введите корректный номер телефона' });
  }

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 4 символа' });
  }

  const users = getUsersMap();
  const exists = users.find((user) => user.phone === normalizedPhone);

  if (exists) {
    return res.status(409).json({ error: 'Аккаунт с таким номером уже существует' });
  }

  const newUser = enrichUser({
    id: Date.now().toString(),
    name: name.trim(),
    phone: normalizedPhone,
    password,
    photo: '',
    showPhone: true,
    blockedUserIds: []
  });

  users.push(newUser);
  writeJson(USERS_FILE, users);

  res.json({ user: publicUser(newUser, newUser.id) });
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body || {};
  const normalizedPhone = normalizePhone(phone || '');
  const users = getUsersMap();

  const user = users.find(
    (item) => item.phone === normalizedPhone && item.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Неверный номер телефона или пароль' });
  }

  res.json({ user: publicUser(user, user.id) });
});

app.put('/api/profile', (req, res) => {
  const { userId, name, showPhone } = req.body || {};
  const users = getUsersMap();
  const user = users.find((item) => item.id === String(userId));

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Имя должно содержать минимум 2 символа' });
  }

  user.name = String(name).trim();
  user.showPhone = showPhone !== false;
  writeJson(USERS_FILE, users);

  io.emit('user:updated', publicUser(user));
  res.json({ user: publicUser(user, user.id) });
});

app.post('/api/profile/photo', upload.single('photo'), (req, res) => {
  const userId = String(req.body.userId || '');
  const users = getUsersMap();
  const user = users.find((item) => item.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Фото не загружено' });
  }

  user.photo = `/uploads/${req.file.filename}`;
  writeJson(USERS_FILE, users);

  io.emit('user:updated', publicUser(user));
  res.json({ user: publicUser(user, user.id) });
});

app.get('/api/blacklist', (req, res) => {
  const currentUserId = String(req.query.currentUserId || '');
  const users = getUsersMap();
  const currentUser = users.find((item) => item.id === currentUserId);

  if (!currentUser) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const blockedUsers = users
    .filter((user) => currentUser.blockedUserIds.includes(user.id))
    .map((user) => publicUser(user, currentUserId));

  res.json({ users: blockedUsers });
});

app.post('/api/block/:otherUserId', (req, res) => {
  const currentUserId = String(req.body?.currentUserId || '');
  const otherUserId = String(req.params.otherUserId || '');
  const users = getUsersMap();
  const currentUser = users.find((item) => item.id === currentUserId);
  const otherUser = users.find((item) => item.id === otherUserId);

  if (!currentUser || !otherUser) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  if (!currentUser.blockedUserIds.includes(otherUserId)) {
    currentUser.blockedUserIds.push(otherUserId);
  }

  writeJson(USERS_FILE, users);
  io.to(`user:${currentUserId}`).to(`user:${otherUserId}`).emit('user:updated', publicUser(currentUser, currentUserId));
  io.to(`user:${currentUserId}`).to(`user:${otherUserId}`).emit('user:updated', publicUser(otherUser));
  res.json({ user: publicUser(currentUser, currentUserId) });
});

app.delete('/api/block/:otherUserId', (req, res) => {
  const currentUserId = String(req.query.currentUserId || '');
  const otherUserId = String(req.params.otherUserId || '');
  const users = getUsersMap();
  const currentUser = users.find((item) => item.id === currentUserId);
  const otherUser = users.find((item) => item.id === otherUserId);

  if (!currentUser || !otherUser) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  currentUser.blockedUserIds = currentUser.blockedUserIds.filter((id) => id !== otherUserId);
  writeJson(USERS_FILE, users);
  io.to(`user:${currentUserId}`).to(`user:${otherUserId}`).emit('user:updated', publicUser(currentUser, currentUserId));
  io.to(`user:${currentUserId}`).to(`user:${otherUserId}`).emit('user:updated', publicUser(otherUser));
  res.json({ user: publicUser(currentUser, currentUserId) });
});

app.get('/api/users', (req, res) => {
  const currentUserId = String(req.query.currentUserId || '');
  const search = normalizePhone(req.query.search || '');
  const users = getUsersMap();
  const messages = getMessages();

  const currentUser = users.find((item) => item.id === currentUserId);
  if (!currentUser) {
    return res.json({ users: [] });
  }

  const decoratedUsers = users
    .filter((user) => user.id !== currentUserId)
    .map((user) => {
      const dialogId = makeDialogId(currentUserId, user.id);
      const lastMessage = [...messages]
        .filter((message) => message.dialogId === dialogId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
      const unreadCount = messages.filter((message) => (
        message.dialogId === dialogId &&
        message.recipientId === currentUserId &&
        !message.readAt &&
        !message.deletedAt
      )).length;
      const iBlocked = currentUser.blockedUserIds.includes(user.id);
      const blockedMe = user.blockedUserIds.includes(currentUserId);

      return {
        ...publicUser(user, currentUserId),
        hasDialog: Boolean(lastMessage),
        lastMessage: lastMessage
          ? {
              text: lastMessage.deletedAt ? 'Сообщение удалено' : lastMessage.text,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
              deletedAt: lastMessage.deletedAt || null
            }
          : null,
        unreadCount,
        isBlocked: iBlocked,
        blockedByUser: blockedMe,
        canMessage: !iBlocked && !blockedMe
      };
    });

  const filtered = decoratedUsers.filter((user) => {
    if (search) return user.phone && normalizePhone(user.phone).includes(search);
    return user.hasDialog || user.isBlocked;
  });

  filtered.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.name.localeCompare(b.name, 'ru');
  });

  res.json({ users: filtered });
});

app.get('/api/messages/:otherUserId', (req, res) => {
  const currentUserId = String(req.query.currentUserId || '');
  const otherUserId = String(req.params.otherUserId || '');
  const users = getUsersMap();
  const currentUser = users.find((item) => item.id === currentUserId);
  const otherUser = users.find((item) => item.id === otherUserId);

  if (!currentUserId || !otherUserId) {
    return res.status(400).json({ error: 'Не выбран диалог' });
  }

  if (!currentUser || !otherUser) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const dialogId = makeDialogId(currentUserId, otherUserId);
  const messages = getMessages()
    .filter((message) => message.dialogId === dialogId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({
    messages,
    canMessage: !areUsersBlocked(currentUser, otherUser),
    isBlocked: currentUser.blockedUserIds.includes(otherUserId),
    blockedByUser: otherUser.blockedUserIds.includes(currentUserId)
  });
});

app.put('/api/messages/:messageId', (req, res) => {
  const messageId = String(req.params.messageId || '');
  const currentUserId = String(req.body?.currentUserId || '');
  const text = String(req.body?.text || '').trim();
  const messages = getMessages();
  const message = messages.find((item) => item.id === messageId);

  if (!message) {
    return res.status(404).json({ error: 'Сообщение не найдено' });
  }

  if (message.senderId !== currentUserId) {
    return res.status(403).json({ error: 'Можно редактировать только свои сообщения' });
  }

  if (message.deletedAt) {
    return res.status(400).json({ error: 'Удаленное сообщение нельзя изменить' });
  }

  if (!text) {
    return res.status(400).json({ error: 'Текст сообщения не должен быть пустым' });
  }

  message.text = text;
  message.editedAt = new Date().toISOString();
  writeJson(MESSAGES_FILE, messages);

  io.to(`user:${message.senderId}`).to(`user:${message.recipientId}`).emit('message:updated', message);
  res.json({ message });
});

app.delete('/api/messages/:messageId', (req, res) => {
  const messageId = String(req.params.messageId || '');
  const currentUserId = String(req.query.currentUserId || '');
  const messages = getMessages();
  const message = messages.find((item) => item.id === messageId);

  if (!message) {
    return res.status(404).json({ error: 'Сообщение не найдено' });
  }

  if (message.senderId !== currentUserId) {
    return res.status(403).json({ error: 'Можно удалять только свои сообщения' });
  }

  message.text = '';
  message.deletedAt = new Date().toISOString();
  message.editedAt = null;
  writeJson(MESSAGES_FILE, messages);

  io.to(`user:${message.senderId}`).to(`user:${message.recipientId}`).emit('message:deleted', message);
  res.json({ message });
});

const onlineUsers = new Map();

function emitPresence(userId, isOnline) {
  io.emit('presence:update', { userId, isOnline });
}

function persistAndBroadcastStatuses(messages, changedMessages) {
  if (!changedMessages.length) return;
  writeJson(MESSAGES_FILE, messages);
  changedMessages.forEach((message) => {
    io.to(`user:${message.senderId}`).to(`user:${message.recipientId}`).emit('message:status-update', {
      id: message.id,
      deliveredAt: message.deliveredAt || null,
      readAt: message.readAt || null
    });
  });
}

io.on('connection', (socket) => {
  socket.on('join-user', (user) => {
    if (!user?.id) return;

    socket.data.user = user;
    socket.join(`user:${user.id}`);

    const count = onlineUsers.get(user.id) || 0;
    onlineUsers.set(user.id, count + 1);

    emitPresence(user.id, true);

    const messages = getMessages();
    const changedMessages = [];
    messages.forEach((message) => {
      if (message.recipientId === user.id && !message.deliveredAt) {
        message.deliveredAt = new Date().toISOString();
        changedMessages.push(message);
      }
    });
    persistAndBroadcastStatuses(messages, changedMessages);
  });

  socket.on('open-dialog', ({ currentUserId, otherUserId }) => {
    const currentId = String(currentUserId || '');
    const otherId = String(otherUserId || '');
    if (!currentId || !otherId) return;

    const users = getUsersMap();
    const currentUser = users.find((item) => item.id === currentId);
    const otherUser = users.find((item) => item.id === otherId);
    if (!currentUser || !otherUser || areUsersBlocked(currentUser, otherUser)) return;

    const dialogId = makeDialogId(currentId, otherId);
    const messages = getMessages();
    const changedMessages = [];

    messages.forEach((message) => {
      if (message.dialogId !== dialogId) return;
      if (message.recipientId !== currentId) return;
      if (message.deletedAt) return;

      let changed = false;
      if (!message.deliveredAt) {
        message.deliveredAt = new Date().toISOString();
        changed = true;
      }
      if (!message.readAt) {
        message.readAt = new Date().toISOString();
        changed = true;
      }
      if (changed) changedMessages.push(message);
    });

    persistAndBroadcastStatuses(messages, changedMessages);
  });

  socket.on('send-private-message', (payload) => {
    const activeUser = socket.data.user;
    if (!activeUser || !payload?.text?.trim() || !payload?.recipientId) return;

    const users = getUsersMap();
    const sender = users.find((user) => user.id === String(activeUser.id));
    const recipient = users.find((user) => user.id === String(payload.recipientId));
    if (!sender || !recipient) return;
    if (areUsersBlocked(sender, recipient)) return;

    const dialogId = makeDialogId(sender.id, recipient.id);
    const messages = getMessages();
    const recipientOnline = onlineUsers.has(recipient.id);

    const message = enrichMessage({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dialogId,
      text: payload.text.trim(),
      createdAt: new Date().toISOString(),
      senderId: sender.id,
      senderName: sender.name,
      senderPhone: sender.phone,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      deliveredAt: recipientOnline ? new Date().toISOString() : null,
      readAt: null,
      editedAt: null,
      deletedAt: null
    });

    messages.push(message);
    writeJson(MESSAGES_FILE, messages);

    io.to(`user:${sender.id}`).to(`user:${recipient.id}`).emit('private-message', message);
  });

  socket.on('disconnect', () => {
    const activeUser = socket.data.user;
    if (!activeUser?.id) return;

    const count = onlineUsers.get(activeUser.id) || 0;
    if (count <= 1) {
      onlineUsers.delete(activeUser.id);
      emitPresence(activeUser.id, false);
    } else {
      onlineUsers.set(activeUser.id, count - 1);
    }
  });
});

app.get('/api/presence', (_req, res) => {
  res.json({ onlineUserIds: [...onlineUsers.keys()] });
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
