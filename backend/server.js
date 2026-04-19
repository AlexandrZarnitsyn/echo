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
    id: String(row.shared_id || row.id),
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
    id: String(row.shared_id || row.id),
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
    attachmentName: row.attachment_name || '',
    conversationId: row.conversation_id || '',
    albumId: row.album_id || '',
    albumIndex: Number(row.album_index || 0)
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
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'group',
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (conversation_id, user_id)
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

  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id TEXT NULL REFERENCES conversations(id) ON DELETE CASCADE;`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS shared_id TEXT NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS album_id TEXT NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS album_index INT NOT NULL DEFAULT 0;`);
  await query(`ALTER TABLE messages ALTER COLUMN recipient_id DROP NOT NULL;`).catch(() => {});
  await query(`ALTER TABLE messages ALTER COLUMN dialog_id DROP NOT NULL;`).catch(() => {});
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

async function getConversationById(conversationId) {
  const result = await query('SELECT * FROM conversations WHERE id = $1 LIMIT 1', [String(conversationId)]);
  return result.rows[0] || null;
}

async function getConversationMembers(conversationId) {
  const result = await query(
    `SELECT u.*
     FROM conversation_members cm
     INNER JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id = $1
     ORDER BY u.name ASC`,
    [String(conversationId)]
  );
  return result.rows.map(mapUserRow);
}

async function isConversationMember(conversationId, userId) {
  const result = await query(
    'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2 LIMIT 1',
    [String(conversationId), String(userId)]
  );
  return result.rowCount > 0;
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

app.get('/api/contacts', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const currentUser = await getUserById(currentUserId);
    if (!currentUser) return res.json({ users: [] });
    const result = await query('SELECT * FROM users WHERE id <> $1 ORDER BY name ASC', [currentUserId]);
    res.json({ users: result.rows.map((row) => publicUser(mapUserRow(row), currentUserId)) });
  } catch (error) {
    console.error('contacts error', error);
    res.status(500).json({ error: 'Не удалось получить контакты' });
  }
});

app.post('/api/conversations', async (req, res) => {
  try {
    const currentUserId = String(req.body?.currentUserId || '');
    const title = String(req.body?.title || '').trim();
    const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds.map(String) : [];
    if (!title || title.length < 2) return res.status(400).json({ error: 'Название беседы слишком короткое' });
    const creator = await getUserById(currentUserId);
    if (!creator) return res.status(404).json({ error: 'Пользователь не найден' });
    const uniqueMembers = [...new Set([currentUserId, ...memberIds.filter(Boolean)])];
    if (uniqueMembers.length < 2) return res.status(400).json({ error: 'Добавьте хотя бы одного участника' });
    const conversationId = crypto.randomUUID();
    await query('INSERT INTO conversations (id, title, created_by, type) VALUES ($1, $2, $3, $4)', [conversationId, title, currentUserId, 'group']);
    for (const userId of uniqueMembers) {
      await query('INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [conversationId, userId]);
    }
    const members = await getConversationMembers(conversationId);
    const payload = { id: conversationId, type: 'group', title, members: members.map((m) => publicUser(m, currentUserId)), unreadCount: 0, canMessage: true, isGroup: true };
    uniqueMembers.forEach((userId) => io.to(`user:${userId}`).emit('conversation:created', payload));
    res.json({ conversation: payload });
  } catch (error) {
    console.error('conversation create error', error);
    res.status(500).json({ error: 'Не удалось создать беседу' });
  }
});

app.get('/api/conversations', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const search = String(req.query.search || '').trim().toLowerCase();
    const result = await query(
      `WITH member_conversations AS (
          SELECT c.*
          FROM conversations c
          INNER JOIN conversation_members cm ON cm.conversation_id = c.id
          WHERE cm.user_id = $1
        ),
        unread_counts AS (
          SELECT conversation_id, COUNT(*)::int AS unread_count
          FROM messages
          WHERE conversation_id IS NOT NULL AND recipient_id = $1 AND read_at IS NULL AND deleted_at IS NULL
          GROUP BY conversation_id
        ),
        last_messages AS (
          SELECT DISTINCT ON (conversation_id) conversation_id, text, created_at, sender_id, deleted_at, attachment_type, attachment_name
          FROM messages
          WHERE conversation_id IS NOT NULL
          ORDER BY conversation_id, created_at DESC
        )
       SELECT mc.*, COALESCE(uc.unread_count, 0) AS unread_count, lm.text AS last_message_text, lm.created_at AS last_message_created_at, lm.sender_id AS last_message_sender_id, lm.deleted_at AS last_message_deleted_at, lm.attachment_type AS last_message_attachment_type, lm.attachment_name AS last_message_attachment_name
       FROM member_conversations mc
       LEFT JOIN unread_counts uc ON uc.conversation_id = mc.id
       LEFT JOIN last_messages lm ON lm.conversation_id = mc.id
       ORDER BY COALESCE(lm.created_at, mc.created_at) DESC`,
      [currentUserId]
    );
    const conversations = [];
    for (const row of result.rows) {
      if (search && !String(row.title || '').toLowerCase().includes(search)) continue;
      const members = await getConversationMembers(row.id);
      conversations.push({
        id: row.id,
        type: 'group',
        isGroup: true,
        title: row.title,
        members: members.map((m) => publicUser(m, currentUserId)),
        memberCount: members.length,
        unreadCount: Number(row.unread_count || 0),
        canMessage: true,
        lastMessage: row.last_message_created_at ? {
          text: row.last_message_deleted_at ? 'Сообщение удалено' : row.last_message_text,
          createdAt: row.last_message_created_at,
          senderId: String(row.last_message_sender_id || ''),
          attachmentType: row.last_message_attachment_type || '',
          attachmentName: row.last_message_attachment_name || '',
          deletedAt: row.last_message_deleted_at || null
        } : null
      });
    }
    res.json({ conversations });
  } catch (error) {
    console.error('conversations error', error);
    res.status(500).json({ error: 'Не удалось получить беседы' });
  }
});

app.get('/api/messages/conversation/:conversationId', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const conversationId = String(req.params.conversationId || '');
    if (!await isConversationMember(conversationId, currentUserId)) return res.status(403).json({ error: 'Нет доступа к беседе' });
    const result = await query(
      `SELECT DISTINCT ON (COALESCE(NULLIF(m.shared_id, ''), m.id))
          m.*, su.name AS sender_name, su.phone AS sender_phone, COALESCE(ru.name, '') AS recipient_name, COALESCE(ru.phone, '') AS recipient_phone
       FROM messages m
       INNER JOIN users su ON su.id = m.sender_id
       LEFT JOIN users ru ON ru.id = m.recipient_id
       WHERE m.conversation_id = $1
       ORDER BY COALESCE(NULLIF(m.shared_id, ''), m.id), m.created_at ASC`,
      [conversationId]
    );
    const changed = await query(
      `UPDATE messages SET read_at = COALESCE(read_at, NOW()), delivered_at = COALESCE(delivered_at, NOW())
       WHERE conversation_id = $1 AND recipient_id = $2 AND deleted_at IS NULL AND (read_at IS NULL OR delivered_at IS NULL)
       RETURNING *`,
      [conversationId, currentUserId]
    );
    await enrichAndBroadcastMessageStatus(changed.rows);
    res.json({ messages: result.rows.map(mapMessageRow), canMessage: true, isGroup: true });
  } catch (error) {
    console.error('conversation messages error', error);
    res.status(500).json({ error: 'Не удалось получить сообщения беседы' });
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


app.post('/api/messages/upload', upload.array('files', 10), async (req, res) => {
  try {
    const senderId = String(req.body?.currentUserId || '');
    const recipientId = String(req.body?.recipientId || '');
    const conversationId = String(req.body?.conversationId || '');
    const text = String(req.body?.text || '').trim();
    const files = Array.isArray(req.files) ? req.files.slice(0, 10) : [];

    if (!senderId) return res.status(400).json({ error: 'Не найден отправитель' });
    if (!recipientId && !conversationId) return res.status(400).json({ error: 'Не выбран получатель' });
    if (!files.length) return res.status(400).json({ error: 'Файлы не были загружены' });

    const sender = await getUserById(senderId);
    if (!sender) return res.status(404).json({ error: 'Пользователь не найден' });

    let conversation = null;
    let members = [];
    let directRecipient = null;
    if (conversationId) {
      conversation = await getConversationById(conversationId);
      if (!conversation || !await isConversationMember(conversationId, senderId)) return res.status(403).json({ error: 'Нет доступа к беседе' });
      members = await getConversationMembers(conversationId);
    } else {
      directRecipient = await getUserById(recipientId);
      if (!directRecipient) return res.status(404).json({ error: 'Пользователь не найден' });
      if (await areUsersBlocked(sender.id, directRecipient.id)) return res.status(403).json({ error: 'Отправка сообщений недоступна' });
    }

    const albumId = files.length > 1 ? crypto.randomUUID() : '';
    const createdMessages = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const isSupported = /^image\//.test(file.mimetype) || /^video\//.test(file.mimetype);
      if (!isSupported) continue;
      const attachmentType = /^image\//.test(file.mimetype) ? 'image' : 'video';
      const attachmentUrl = `/uploads/${file.filename}`;
      const messageId = crypto.randomUUID();
      if (conversation) {
        const recipients = members.filter((m) => String(m.id) !== String(sender.id));
        for (const member of recipients) {
          await query(
            `INSERT INTO messages (id, shared_id, dialog_id, conversation_id, text, sender_id, recipient_id, delivered_at, read_at, edited_at, deleted_at, attachment_url, attachment_type, attachment_name, album_id, album_index)
             VALUES ($1, $2, '', $3, $4, $5, $6, $7, NULL, NULL, NULL, $8, $9, $10, $11, $12)`,
            [crypto.randomUUID(), messageId, conversation.id, index === 0 ? text : '', sender.id, member.id, onlineUsers.has(String(member.id)) ? new Date().toISOString() : null, attachmentUrl, attachmentType, file.originalname || file.filename, albumId, index]
          );
        }
        const synthetic = {
          id: messageId, shared_id: messageId, dialog_id: '', conversation_id: conversation.id, text: index === 0 ? text : '', sender_id: sender.id, recipient_id: sender.id, created_at: new Date().toISOString(), delivered_at: null, read_at: null, edited_at: null, deleted_at: null, attachment_url: attachmentUrl, attachment_type: attachmentType, attachment_name: file.originalname || file.filename, sender_name: sender.name, sender_phone: sender.phone, recipient_name: '', recipient_phone: '', album_id: albumId, album_index: index
        };
        createdMessages.push(mapMessageRow(synthetic));
      } else {
        const dialogId = makeDialogId(sender.id, directRecipient.id);
        await query(
          `INSERT INTO messages (id, dialog_id, text, sender_id, recipient_id, delivered_at, read_at, edited_at, deleted_at, attachment_url, attachment_type, attachment_name, album_id, album_index)
           VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, $7, $8, $9, $10, $11)`,
          [messageId, dialogId, index === 0 ? text : '', sender.id, directRecipient.id, onlineUsers.has(String(directRecipient.id)) ? new Date().toISOString() : null, attachmentUrl, attachmentType, file.originalname || file.filename, albumId, index]
        );
        const fullMessage = await query(
          `SELECT m.*, su.name AS sender_name, su.phone AS sender_phone, ru.name AS recipient_name, ru.phone AS recipient_phone
           FROM messages m
           INNER JOIN users su ON su.id = m.sender_id
           INNER JOIN users ru ON ru.id = m.recipient_id
           WHERE m.id = $1`,
          [messageId]
        );
        createdMessages.push(mapMessageRow(fullMessage.rows[0]));
      }
    }

    if (conversation) {
      const memberIds = members.map((m) => String(m.id));
      createdMessages.forEach((message) => memberIds.forEach((userId) => io.to(`user:${userId}`).emit('conversation-message', message)));
    } else {
      createdMessages.forEach((message) => io.to(`user:${sender.id}`).to(`user:${directRecipient.id}`).emit('private-message', message));
    }
    res.json({ messages: createdMessages });
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

  socket.on('open-conversation', async ({ currentUserId, conversationId }) => {
    try {
      const currentId = String(currentUserId || '');
      const convId = String(conversationId || '');
      if (!currentId || !convId || !await isConversationMember(convId, currentId)) return;
      const changed = await query(
        `UPDATE messages
         SET delivered_at = COALESCE(delivered_at, NOW()),
             read_at = COALESCE(read_at, NOW())
         WHERE conversation_id = $1 AND recipient_id = $2 AND deleted_at IS NULL AND (delivered_at IS NULL OR read_at IS NULL)
         RETURNING *`,
        [convId, currentId]
      );
      await enrichAndBroadcastMessageStatus(changed.rows);
    } catch (error) {
      console.error('open-conversation error', error);
    }
  });

  socket.on('send-message', async (payload) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser || !payload?.text?.trim()) return;
      const sender = await getUserById(activeUser.id);
      if (!sender) return;
      if (payload.conversationId) {
        const conversation = await getConversationById(payload.conversationId);
        if (!conversation || !await isConversationMember(conversation.id, sender.id)) return;
        const members = await getConversationMembers(conversation.id);
        const createdAt = new Date().toISOString();
        const syntheticId = crypto.randomUUID();
        for (const member of members) {
          if (String(member.id) === String(sender.id)) continue;
          const id = crypto.randomUUID();
          await query(
            `INSERT INTO messages (id, shared_id, dialog_id, conversation_id, text, sender_id, recipient_id, delivered_at, read_at, edited_at, deleted_at)
             VALUES ($1, $2, '', $3, $4, $5, $6, $7, NULL, NULL, NULL)`,
            [id, syntheticId, conversation.id, String(payload.text).trim(), sender.id, member.id, onlineUsers.has(String(member.id)) ? createdAt : null]
          );
        }
        const synthetic = mapMessageRow({ id: syntheticId, shared_id: syntheticId, dialog_id: '', conversation_id: conversation.id, text: String(payload.text).trim(), sender_id: sender.id, recipient_id: sender.id, created_at: createdAt, delivered_at: null, read_at: null, edited_at: null, deleted_at: null, sender_name: sender.name, sender_phone: sender.phone, recipient_name: '', recipient_phone: '', attachment_url: '', attachment_type: '', attachment_name: '', album_id: '', album_index: 0 });
        members.forEach((member) => io.to(`user:${member.id}`).emit('conversation-message', synthetic));
      } else if (payload.recipientId) {
        socket.emit('send-private-message', payload);
      }
    } catch (error) {
      console.error('send-message error', error);
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
