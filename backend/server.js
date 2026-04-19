const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const { Pool } = require('pg');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const DATABASE_URL = process.env.DATABASE_URL;
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'public', 'uploads');

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
});

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

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

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    password: row.password,
    photo: row.photo || '',
    showPhone: row.show_phone !== false,
    createdAt: row.created_at
  };
}

function mapMessageRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    dialogId: row.dialog_id,
    text: row.text || '',
    createdAt: row.created_at,
    senderId: String(row.sender_id),
    senderName: row.sender_name,
    senderPhone: row.sender_phone,
    recipientId: String(row.recipient_id),
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    attachmentUrl: row.attachment_url || '',
    attachmentType: row.attachment_type || '',
    attachmentName: row.attachment_name || ''
  };
}

function publicUser(user, viewerId = null, blockedUserIds = []) {
  const isSelf = viewerId && String(viewerId) === String(user.id);
  return {
    id: String(user.id),
    name: user.name,
    phone: (isSelf || user.showPhone) ? user.phone : '',
    phoneHidden: !isSelf && !user.showPhone,
    showPhone: user.showPhone,
    photo: user.photo || '',
    blockedUserIds: isSelf ? blockedUserIds.map(String) : undefined
  };
}

async function query(sql, params = []) {
  return pool.query(sql, params);
}

async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      photo TEXT NOT NULL DEFAULT '',
      show_phone BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (blocker_id, blocked_id)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      dialog_id TEXT NOT NULL,
      text TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delivered_at TIMESTAMPTZ NULL,
      read_at TIMESTAMPTZ NULL,
      edited_at TIMESTAMPTZ NULL,
      deleted_at TIMESTAMPTZ NULL
    );
  `);

  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT NOT NULL DEFAULT '';`);

  await query('CREATE INDEX IF NOT EXISTS idx_messages_dialog_id_created_at ON messages(dialog_id, created_at DESC);');
  await query('CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, read_at, deleted_at);');
}

async function getUserById(userId) {
  const result = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
  return mapUserRow(result.rows[0]);
}

async function getUserByPhone(phone) {
  const result = await query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [normalizePhone(phone)]);
  return mapUserRow(result.rows[0]);
}

async function getBlockedIds(userId) {
  const result = await query('SELECT blocked_id FROM user_blocks WHERE blocker_id = $1', [String(userId)]);
  return result.rows.map((row) => String(row.blocked_id));
}

async function areUsersBlocked(userAId, userBId) {
  const result = await query(
    `SELECT 1
     FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [String(userAId), String(userBId)]
  );
  return result.rowCount > 0;
}

async function enrichAndBroadcastMessageStatus(changedRows) {
  for (const row of changedRows) {
    const message = mapMessageRow(row);
    io.to(`user:${message.senderId}`).to(`user:${message.recipientId}`).emit('message:status-update', {
      id: message.id,
      deliveredAt: message.deliveredAt || null,
      readAt: message.readAt || null
    });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    const prefix = file.mimetype && file.mimetype.startsWith('video/') ? 'video' : (file.mimetype && file.mimetype.startsWith('image/') ? 'image' : 'file');
    cb(null, `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
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

app.post('/api/register', async (req, res) => {
  try {
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

    const existing = await getUserByPhone(normalizedPhone);
    if (existing) {
      return res.status(409).json({ error: 'Аккаунт с таким номером уже существует' });
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO users (id, name, phone, password, photo, show_phone)
       VALUES ($1, $2, $3, $4, '', TRUE)`,
      [id, String(name).trim(), normalizedPhone, String(password)]
    );

    const newUser = await getUserById(id);
    res.json({ user: publicUser(newUser, id, []) });
  } catch (error) {
    console.error('register error', error);
    res.status(500).json({ error: 'Не удалось создать аккаунт' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body || {};
    const normalizedPhone = normalizePhone(phone || '');
    const result = await query(
      'SELECT * FROM users WHERE phone = $1 AND password = $2 LIMIT 1',
      [normalizedPhone, String(password || '')]
    );
    const user = mapUserRow(result.rows[0]);

    if (!user) {
      return res.status(401).json({ error: 'Неверный номер телефона или пароль' });
    }

    const blockedUserIds = await getBlockedIds(user.id);
    res.json({ user: publicUser(user, user.id, blockedUserIds) });
  } catch (error) {
    console.error('login error', error);
    res.status(500).json({ error: 'Не удалось выполнить вход' });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const { userId, name, showPhone } = req.body || {};
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: 'Имя должно содержать минимум 2 символа' });
    }

    const existing = await getUserById(userId);
    if (!existing) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await query(
      'UPDATE users SET name = $2, show_phone = $3 WHERE id = $1',
      [String(userId), String(name).trim(), showPhone !== false]
    );

    const user = await getUserById(userId);
    const blockedUserIds = await getBlockedIds(user.id);
    io.emit('user:updated', publicUser(user));
    res.json({ user: publicUser(user, user.id, blockedUserIds) });
  } catch (error) {
    console.error('profile update error', error);
    res.status(500).json({ error: 'Не удалось обновить профиль' });
  }
});

app.post('/api/profile/photo', upload.single('photo'), async (req, res) => {
  try {
    const userId = String(req.body.userId || '');
    const existing = await getUserById(userId);
    if (!existing) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Фото не загружено' });
    }

    await query('UPDATE users SET photo = $2 WHERE id = $1', [userId, `/uploads/${req.file.filename}`]);
    const user = await getUserById(userId);
    const blockedUserIds = await getBlockedIds(user.id);
    io.emit('user:updated', publicUser(user));
    res.json({ user: publicUser(user, user.id, blockedUserIds) });
  } catch (error) {
    console.error('photo upload error', error);
    res.status(500).json({ error: 'Не удалось загрузить фото' });
  }
});

app.get('/api/blacklist', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const currentUser = await getUserById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const blockedUsersResult = await query(
      `SELECT u.*
       FROM users u
       INNER JOIN user_blocks ub ON ub.blocked_id = u.id
       WHERE ub.blocker_id = $1
       ORDER BY u.name ASC`,
      [currentUserId]
    );

    res.json({ users: blockedUsersResult.rows.map((row) => publicUser(mapUserRow(row), currentUserId)) });
  } catch (error) {
    console.error('blacklist error', error);
    res.status(500).json({ error: 'Не удалось получить черный список' });
  }
});

app.post('/api/block/:otherUserId', async (req, res) => {
  try {
    const currentUserId = String(req.body?.currentUserId || '');
    const otherUserId = String(req.params.otherUserId || '');
    const currentUser = await getUserById(currentUserId);
    const otherUser = await getUserById(otherUserId);

    if (!currentUser || !otherUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await query(
      `INSERT INTO user_blocks (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [currentUserId, otherUserId]
    );

    const blockedUserIds = await getBlockedIds(currentUserId);
    io.to(`user:${currentUserId}`).to(`user:${otherUserId}`).emit('user:updated', publicUser(currentUser, currentUserId, blockedUserIds));
    io.to(`user:${currentUserId}`).to(`user:${otherUserId}`).emit('user:updated', publicUser(otherUser));
    res.json({ user: publicUser(currentUser, currentUserId, blockedUserIds) });
  } catch (error) {
    console.error('block error', error);
    res.status(500).json({ error: 'Не удалось обновить черный список' });
  }
});

app.delete('/api/block/:otherUserId', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const otherUserId = String(req.params.otherUserId || '');
    const currentUser = await getUserById(currentUserId);
    const otherUser = await getUserById(otherUserId);

    if (!currentUser || !otherUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [currentUserId, otherUserId]);
    const blockedUserIds = await getBlockedIds(currentUserId);
    io.to(`user:${currentUserId}`).to(`user:${otherUserId}`).emit('user:updated', publicUser(currentUser, currentUserId, blockedUserIds));
    io.to(`user:${currentUserId}`).to(`user:${otherUserId}`).emit('user:updated', publicUser(otherUser));
    res.json({ user: publicUser(currentUser, currentUserId, blockedUserIds) });
  } catch (error) {
    console.error('unblock error', error);
    res.status(500).json({ error: 'Не удалось удалить из черного списка' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const search = normalizePhone(req.query.search || '');
    const currentUser = await getUserById(currentUserId);

    if (!currentUser) {
      return res.json({ users: [] });
    }

    const result = await query(
      `WITH viewer_blocks AS (
          SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
        ),
        blocked_me AS (
          SELECT blocker_id FROM user_blocks WHERE blocked_id = $1
        ),
        last_messages AS (
          SELECT DISTINCT ON (m.dialog_id)
            m.dialog_id,
            m.text,
            m.created_at,
            m.sender_id,
            m.deleted_at,
            m.attachment_type,
            m.attachment_name
          FROM messages m
          ORDER BY m.dialog_id, m.created_at DESC
        ),
        unread_counts AS (
          SELECT sender_id, COUNT(*)::int AS unread_count
          FROM messages
          WHERE recipient_id = $1 AND read_at IS NULL AND deleted_at IS NULL
          GROUP BY sender_id
        )
       SELECT
         u.*,
         lm.text AS last_message_text,
         lm.created_at AS last_message_created_at,
         lm.sender_id AS last_message_sender_id,
         lm.deleted_at AS last_message_deleted_at,
         lm.attachment_type AS last_message_attachment_type,
         lm.attachment_name AS last_message_attachment_name,
         COALESCE(uc.unread_count, 0) AS unread_count,
         (vb.blocked_id IS NOT NULL) AS is_blocked,
         (bm.blocker_id IS NOT NULL) AS blocked_by_user,
         (lm.dialog_id IS NOT NULL) AS has_dialog
       FROM users u
       LEFT JOIN viewer_blocks vb ON vb.blocked_id = u.id
       LEFT JOIN blocked_me bm ON bm.blocker_id = u.id
       LEFT JOIN last_messages lm ON lm.dialog_id = CASE WHEN u.id < $1 THEN u.id || ':' || $1 ELSE $1 || ':' || u.id END
       LEFT JOIN unread_counts uc ON uc.sender_id = u.id
       WHERE u.id <> $1
       ORDER BY COALESCE(lm.created_at, TO_TIMESTAMP(0)) DESC, u.name ASC`,
      [currentUserId]
    );

    const filtered = result.rows
      .map((row) => {
        const user = mapUserRow(row);
        return {
          ...publicUser(user, currentUserId),
          hasDialog: row.has_dialog,
          lastMessage: row.last_message_created_at ? {
            text: row.last_message_deleted_at ? 'Сообщение удалено' : row.last_message_text,
            createdAt: row.last_message_created_at,
            senderId: String(row.last_message_sender_id),
            deletedAt: row.last_message_deleted_at || null,
            attachmentType: row.last_message_attachment_type || '',
            attachmentName: row.last_message_attachment_name || ''
          } : null,
          unreadCount: Number(row.unread_count || 0),
          isBlocked: row.is_blocked,
          blockedByUser: row.blocked_by_user,
          canMessage: !row.is_blocked && !row.blocked_by_user
        };
      })
      .filter((user) => {
        if (search) return user.phone && normalizePhone(user.phone).includes(search);
        return user.hasDialog || user.isBlocked;
      });

    res.json({ users: filtered });
  } catch (error) {
    console.error('users error', error);
    res.status(500).json({ error: 'Не удалось получить список пользователей' });
  }
});

app.get('/api/messages/:otherUserId', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const otherUserId = String(req.params.otherUserId || '');
    if (!currentUserId || !otherUserId) {
      return res.status(400).json({ error: 'Не выбран диалог' });
    }

    const currentUser = await getUserById(currentUserId);
    const otherUser = await getUserById(otherUserId);
    if (!currentUser || !otherUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const dialogId = makeDialogId(currentUserId, otherUserId);
    const result = await query(
      `SELECT
          m.*,
          su.name AS sender_name,
          su.phone AS sender_phone,
          ru.name AS recipient_name,
          ru.phone AS recipient_phone
       FROM messages m
       INNER JOIN users su ON su.id = m.sender_id
       INNER JOIN users ru ON ru.id = m.recipient_id
       WHERE m.dialog_id = $1
       ORDER BY m.created_at ASC`,
      [dialogId]
    );

    const iBlockedResult = await query(
      'SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1',
      [currentUserId, otherUserId]
    );
    const blockedByResult = await query(
      'SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1',
      [otherUserId, currentUserId]
    );

    res.json({
      messages: result.rows.map(mapMessageRow),
      canMessage: iBlockedResult.rowCount === 0 && blockedByResult.rowCount === 0,
      isBlocked: iBlockedResult.rowCount > 0,
      blockedByUser: blockedByResult.rowCount > 0
    });
  } catch (error) {
    console.error('messages fetch error', error);
    res.status(500).json({ error: 'Не удалось получить сообщения' });
  }
});

app.put('/api/messages/:messageId', async (req, res) => {
  try {
    const messageId = String(req.params.messageId || '');
    const currentUserId = String(req.body?.currentUserId || '');
    const text = String(req.body?.text || '').trim();

    if (!text) {
      return res.status(400).json({ error: 'Текст сообщения не должен быть пустым' });
    }

    const existing = await query('SELECT * FROM messages WHERE id = $1 LIMIT 1', [messageId]);
    const message = existing.rows[0];
    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }
    if (String(message.sender_id) !== currentUserId) {
      return res.status(403).json({ error: 'Можно редактировать только свои сообщения' });
    }
    if (message.deleted_at) {
      return res.status(400).json({ error: 'Удаленное сообщение нельзя изменить' });
    }

    const updated = await query(
      `UPDATE messages
       SET text = $2, edited_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [messageId, text]
    );

    const fullMessage = await query(
      `SELECT
          m.*,
          su.name AS sender_name,
          su.phone AS sender_phone,
          ru.name AS recipient_name,
          ru.phone AS recipient_phone
       FROM messages m
       INNER JOIN users su ON su.id = m.sender_id
       INNER JOIN users ru ON ru.id = m.recipient_id
       WHERE m.id = $1`,
      [messageId]
    );

    const payload = mapMessageRow(fullMessage.rows[0]);
    io.to(`user:${payload.senderId}`).to(`user:${payload.recipientId}`).emit('message:updated', payload);
    res.json({ message: payload });
  } catch (error) {
    console.error('message edit error', error);
    res.status(500).json({ error: 'Не удалось обновить сообщение' });
  }
});

app.delete('/api/messages/:messageId', async (req, res) => {
  try {
    const messageId = String(req.params.messageId || '');
    const currentUserId = String(req.query.currentUserId || '');
    const existing = await query('SELECT * FROM messages WHERE id = $1 LIMIT 1', [messageId]);
    const message = existing.rows[0];

    if (!message) {
      return res.status(404).json({ error: 'Сообщение не найдено' });
    }
    if (String(message.sender_id) !== currentUserId) {
      return res.status(403).json({ error: 'Можно удалять только свои сообщения' });
    }

    await query(
      `UPDATE messages
       SET text = '', deleted_at = NOW(), edited_at = NULL
       WHERE id = $1`,
      [messageId]
    );

    const fullMessage = await query(
      `SELECT
          m.*,
          su.name AS sender_name,
          su.phone AS sender_phone,
          ru.name AS recipient_name,
          ru.phone AS recipient_phone
       FROM messages m
       INNER JOIN users su ON su.id = m.sender_id
       INNER JOIN users ru ON ru.id = m.recipient_id
       WHERE m.id = $1`,
      [messageId]
    );

    const payload = mapMessageRow(fullMessage.rows[0]);
    io.to(`user:${payload.senderId}`).to(`user:${payload.recipientId}`).emit('message:deleted', payload);
    res.json({ message: payload });
  } catch (error) {
    console.error('message delete error', error);
    res.status(500).json({ error: 'Не удалось удалить сообщение' });
  }
});


app.post('/api/messages/upload', upload.single('file'), async (req, res) => {
  try {
    const senderId = String(req.body?.currentUserId || '');
    const recipientId = String(req.body?.recipientId || '');
    const text = String(req.body?.text || '').trim();
    const file = req.file;

    if (!senderId || !recipientId) {
      return res.status(400).json({ error: 'Не выбран получатель' });
    }
    if (!file) {
      return res.status(400).json({ error: 'Файл не был загружен' });
    }

    const sender = await getUserById(senderId);
    const recipient = await getUserById(recipientId);
    if (!sender || !recipient) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (await areUsersBlocked(sender.id, recipient.id)) {
      return res.status(403).json({ error: 'Отправка сообщений недоступна' });
    }

    const isSupported = /^image\//.test(file.mimetype) || /^video\//.test(file.mimetype);
    if (!isSupported) {
      return res.status(400).json({ error: 'Можно отправлять только фото и видео' });
    }

    const dialogId = makeDialogId(sender.id, recipient.id);
    const recipientOnline = onlineUsers.has(String(recipient.id));
    const messageId = crypto.randomUUID();
    const attachmentType = /^image\//.test(file.mimetype) ? 'image' : 'video';
    const attachmentUrl = `/uploads/${file.filename}`;

    await query(
      `INSERT INTO messages (
        id, dialog_id, text, sender_id, recipient_id, delivered_at, read_at, edited_at, deleted_at, attachment_url, attachment_type, attachment_name
      ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, $7, $8, $9)`,
      [
        messageId,
        dialogId,
        text,
        String(sender.id),
        String(recipient.id),
        recipientOnline ? new Date().toISOString() : null,
        attachmentUrl,
        attachmentType,
        file.originalname || file.filename
      ]
    );

    const fullMessage = await query(
      `SELECT
          m.*,
          su.name AS sender_name,
          su.phone AS sender_phone,
          ru.name AS recipient_name,
          ru.phone AS recipient_phone
       FROM messages m
       INNER JOIN users su ON su.id = m.sender_id
       INNER JOIN users ru ON ru.id = m.recipient_id
       WHERE m.id = $1`,
      [messageId]
    );

    const message = mapMessageRow(fullMessage.rows[0]);
    io.to(`user:${sender.id}`).to(`user:${recipient.id}`).emit('private-message', message);
    res.json({ message });
  } catch (error) {
    console.error('message upload error', error);
    res.status(500).json({ error: 'Не удалось отправить файл' });
  }
});

const onlineUsers = new Map();

function emitPresence(userId, isOnline) {
  io.emit('presence:update', { userId, isOnline });
}

io.on('connection', (socket) => {
  socket.on('join-user', async (user) => {
    try {
      if (!user?.id) return;

      socket.data.user = user;
      socket.join(`user:${user.id}`);

      const count = onlineUsers.get(user.id) || 0;
      onlineUsers.set(user.id, count + 1);
      emitPresence(user.id, true);

      const delivered = await query(
        `UPDATE messages
         SET delivered_at = NOW()
         WHERE recipient_id = $1 AND delivered_at IS NULL
         RETURNING *`,
        [String(user.id)]
      );
      await enrichAndBroadcastMessageStatus(delivered.rows);
    } catch (error) {
      console.error('join-user error', error);
    }
  });

  socket.on('open-dialog', async ({ currentUserId, otherUserId }) => {
    try {
      const currentId = String(currentUserId || '');
      const otherId = String(otherUserId || '');
      if (!currentId || !otherId) return;
      if (await areUsersBlocked(currentId, otherId)) return;

      const dialogId = makeDialogId(currentId, otherId);
      const changed = await query(
        `UPDATE messages
         SET
           delivered_at = COALESCE(delivered_at, NOW()),
           read_at = COALESCE(read_at, NOW())
         WHERE dialog_id = $1
           AND recipient_id = $2
           AND deleted_at IS NULL
           AND (delivered_at IS NULL OR read_at IS NULL)
         RETURNING *`,
        [dialogId, currentId]
      );
      await enrichAndBroadcastMessageStatus(changed.rows);
    } catch (error) {
      console.error('open-dialog error', error);
    }
  });

  socket.on('send-private-message', async (payload) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser || !payload?.text?.trim() || !payload?.recipientId) return;

      const sender = await getUserById(activeUser.id);
      const recipient = await getUserById(payload.recipientId);
      if (!sender || !recipient) return;
      if (await areUsersBlocked(sender.id, recipient.id)) return;

      const dialogId = makeDialogId(sender.id, recipient.id);
      const recipientOnline = onlineUsers.has(String(recipient.id));
      const messageId = crypto.randomUUID();

      await query(
        `INSERT INTO messages (
          id, dialog_id, text, sender_id, recipient_id, delivered_at, read_at, edited_at, deleted_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL)`,
        [
          messageId,
          dialogId,
          String(payload.text).trim(),
          String(sender.id),
          String(recipient.id),
          recipientOnline ? new Date().toISOString() : null
        ]
      );

      const fullMessage = await query(
        `SELECT
            m.*,
            su.name AS sender_name,
            su.phone AS sender_phone,
            ru.name AS recipient_name,
            ru.phone AS recipient_phone
         FROM messages m
         INNER JOIN users su ON su.id = m.sender_id
         INNER JOIN users ru ON ru.id = m.recipient_id
         WHERE m.id = $1`,
        [messageId]
      );

      const message = mapMessageRow(fullMessage.rows[0]);
      io.to(`user:${sender.id}`).to(`user:${recipient.id}`).emit('private-message', message);
    } catch (error) {
      console.error('send-private-message error', error);
    }
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

(async () => {
  try {
    await initDatabase();
    server.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('startup error', error);
    process.exit(1);
  }
})();
