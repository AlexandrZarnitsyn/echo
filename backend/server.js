const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
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
const SECONDARY_DATABASE_URL = process.env.SECONDARY_DATABASE_URL || '';
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

const secondaryPool = SECONDARY_DATABASE_URL
  ? new Pool({
      connectionString: SECONDARY_DATABASE_URL,
      ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
    })
  : null;

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
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at || null
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
    recipientId: row.recipient_id ? String(row.recipient_id) : '',
    recipientName: row.recipient_name || '',
    recipientPhone: row.recipient_phone || '',
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    attachmentUrl: row.attachment_url || (row.media_id ? `/api/media/${row.media_id}` : ''),
    attachmentType: row.attachment_type || '',
    attachmentName: row.attachment_name || '',
    groupId: row.group_id || '',
    groupName: row.group_name || '',
    isGroup: Boolean(row.group_id),
    audioListened: row.audio_listened === true || row.audio_listened === 't' || row.audio_listened === 1,
    avatarSuggestionStatus: row.avatar_suggestion_status || '',
    avatarSuggestionTargetUserId: row.avatar_suggestion_target_user_id ? String(row.avatar_suggestion_target_user_id) : '',
    replyToMessageId: row.reply_to_message_id ? String(row.reply_to_message_id) : '',
    replyPreviewText: row.reply_preview_text || '',
    replyPreviewAttachmentType: row.reply_preview_attachment_type || '',
    replyPreviewSenderId: row.reply_preview_sender_id ? String(row.reply_preview_sender_id) : '',
    replyPreviewSenderName: row.reply_preview_sender_name || '',
    replyPreviewDeletedAt: row.reply_preview_deleted_at || null
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
    lastSeenAt: user.lastSeenAt || null,
    blockedUserIds: isSelf ? blockedUserIds.map(String) : undefined
  };
}

async function query(sql, params = []) {
  return pool.query(sql, params);
}

async function secondaryQuery(sql, params = []) {
  if (!secondaryPool) {
    throw new Error('SECONDARY_DATABASE_URL is not configured');
  }
  return secondaryPool.query(sql, params);
}

async function storeMediaFile({ mediaId, ownerUserId = null, mimeType = 'application/octet-stream', originalName = '', sizeBytes = 0, data = Buffer.alloc(0) }) {
  const blobBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data || []);
  const metadataBuffer = secondaryPool ? Buffer.alloc(0) : blobBuffer;
  await query(
    `INSERT INTO media_files (id, owner_user_id, mime_type, original_name, size_bytes, data)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [mediaId, ownerUserId, String(mimeType || 'application/octet-stream'), String(originalName || ''), Number(sizeBytes || blobBuffer.length || 0), metadataBuffer]
  );
  if (secondaryPool) {
    await secondaryQuery(
      `INSERT INTO media_blobs (id, data, size_bytes)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, size_bytes = EXCLUDED.size_bytes`,
      [mediaId, blobBuffer, Number(sizeBytes || blobBuffer.length || 0)]
    );
  }
}

async function getMediaById(mediaId) {
  const result = await query('SELECT id, mime_type, original_name, data, size_bytes, created_at FROM media_files WHERE id = $1 LIMIT 1', [mediaId]);
  const media = result.rows[0];
  if (!media) return null;
  let buffer = media.data;
  if (secondaryPool && (!buffer || !buffer.length)) {
    const blobResult = await secondaryQuery('SELECT data, size_bytes FROM media_blobs WHERE id = $1 LIMIT 1', [mediaId]).catch(() => ({ rows: [] }));
    const blob = blobResult.rows[0];
    if (blob?.data) {
      buffer = blob.data;
      if (!media.size_bytes) media.size_bytes = blob.size_bytes;
    }
  }
  return {
    ...media,
    data: buffer || Buffer.alloc(0)
  };
}

async function deleteMediaById(mediaId) {
  await deleteMediaById(mediaId);
  if (secondaryPool) {
    await secondaryQuery('DELETE FROM media_blobs WHERE id = $1', [mediaId]).catch(() => null);
  }
}


const ENABLE_STORAGE_CLEANUP = process.env.ENABLE_STORAGE_CLEANUP !== 'false';
const STORAGE_CLEANUP_INTERVAL_MS = Number(process.env.STORAGE_CLEANUP_INTERVAL_MS || 6 * 60 * 60 * 1000);
const STORAGE_CLEANUP_INITIAL_DELAY_MS = Number(process.env.STORAGE_CLEANUP_INITIAL_DELAY_MS || 20 * 1000);
const STORAGE_CLEANUP_MAX_AGE_HOURS = Number(process.env.STORAGE_CLEANUP_MAX_AGE_HOURS || 24);
const STORAGE_CLEANUP_DELETE_REFERENCED_LEGACY = process.env.STORAGE_CLEANUP_DELETE_REFERENCED_LEGACY === 'true';

function normalizeUploadUrlToRelativePath(value) {
  const raw = String(value || '').trim();
  if (!raw || !raw.startsWith('/uploads/')) return '';
  const relative = raw.replace(/^\/uploads\//, '').replace(/\\/g, '/');
  const normalized = path.posix.normalize(relative).replace(/^\/+/, '');
  if (!normalized || normalized.startsWith('..')) return '';
  return normalized;
}

async function collectReferencedLegacyUploadPaths() {
  const referenced = new Set();

  const addPath = (value) => {
    const relative = normalizeUploadUrlToRelativePath(value);
    if (relative) referenced.add(relative);
  };

  const [messageRows, userRows, groupRows] = await Promise.all([
    query(`SELECT attachment_url FROM messages WHERE attachment_url LIKE '/uploads/%'`),
    query(`SELECT photo FROM users WHERE photo LIKE '/uploads/%'`),
    query(`SELECT photo FROM groups WHERE photo LIKE '/uploads/%'`)
  ]);

  for (const row of messageRows.rows) addPath(row.attachment_url);
  for (const row of userRows.rows) addPath(row.photo);
  for (const row of groupRows.rows) addPath(row.photo);

  return referenced;
}

async function getDirectorySizeBytes(dirPath) {
  let total = 0;
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirectorySizeBytes(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(fullPath).catch(() => null);
        if (stat) total += Number(stat.size || 0);
      }
    }
  } catch (_error) {
    return total;
  }
  return total;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unit = -1;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit <= 0 ? 0 : 1)} ${units[unit]}`;
}

async function deleteFileIfSafe(filePath) {
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

async function cleanupLegacyUploadsOnce() {
  if (!ENABLE_STORAGE_CLEANUP) return;
  const startedAt = Date.now();
  const maxAgeMs = Math.max(1, STORAGE_CLEANUP_MAX_AGE_HOURS) * 60 * 60 * 1000;
  const referenced = await collectReferencedLegacyUploadPaths();
  const beforeBytes = await getDirectorySizeBytes(UPLOADS_DIR);
  let deletedFiles = 0;
  let deletedBytes = 0;
  let keptReferenced = 0;
  let keptFresh = 0;

  async function walk(dirPath, prefix = '') {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name === '.gitkeep') continue;
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, relativePath);
        const remaining = await fs.promises.readdir(fullPath).catch(() => []);
        if (!remaining.length) {
          await fs.promises.rmdir(fullPath).catch(() => null);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.promises.stat(fullPath).catch(() => null);
      if (!stat) continue;
      const ageMs = Date.now() - Number(stat.mtimeMs || stat.ctimeMs || Date.now());
      const isReferenced = referenced.has(relativePath);
      if (isReferenced && !STORAGE_CLEANUP_DELETE_REFERENCED_LEGACY) {
        keptReferenced += 1;
        continue;
      }
      if (ageMs < maxAgeMs) {
        keptFresh += 1;
        continue;
      }
      const removed = await deleteFileIfSafe(fullPath);
      if (removed) {
        deletedFiles += 1;
        deletedBytes += Number(stat.size || 0);
      }
    }
  }

  await walk(UPLOADS_DIR, '');
  const afterBytes = await getDirectorySizeBytes(UPLOADS_DIR);
  console.log(
    `[storage-cleanup] uploads before=${formatBytes(beforeBytes)} after=${formatBytes(afterBytes)} deletedFiles=${deletedFiles} deletedBytes=${formatBytes(deletedBytes)} keptReferenced=${keptReferenced} keptFresh=${keptFresh} durationMs=${Date.now() - startedAt}`
  );
}

function scheduleStorageCleanup() {
  if (!ENABLE_STORAGE_CLEANUP) {
    console.log('[storage-cleanup] disabled');
    return;
  }
  const run = async () => {
    try {
      await cleanupLegacyUploadsOnce();
    } catch (error) {
      console.error('[storage-cleanup] error', error);
    }
  };
  setTimeout(run, Math.max(0, STORAGE_CLEANUP_INITIAL_DELAY_MS));
  setInterval(run, Math.max(60 * 1000, STORAGE_CLEANUP_INTERVAL_MS));
  console.log(`[storage-cleanup] scheduled interval=${STORAGE_CLEANUP_INTERVAL_MS}ms maxAgeHours=${STORAGE_CLEANUP_MAX_AGE_HOURS} deleteReferencedLegacy=${STORAGE_CLEANUP_DELETE_REFERENCED_LEGACY}`);
}


const dialogsBootstrapCache = new Map();
const DIALOGS_BOOTSTRAP_TTL_MS = Number(process.env.DIALOGS_BOOTSTRAP_TTL_MS || 15000);

function getDialogsBootstrapCacheKey(userId, search = '') {
  return `${String(userId)}::${String(search || '').trim().toLowerCase()}`;
}

function invalidateDialogsBootstrapCache(userIds = []) {
  const prefixes = new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean).map((id) => `${String(id)}::`));
  if (!prefixes.size) {
    dialogsBootstrapCache.clear();
    return;
  }
  for (const key of [...dialogsBootstrapCache.keys()]) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        dialogsBootstrapCache.delete(key);
        break;
      }
    }
  }
}

function setDialogsBootstrapCache(userId, search, payload) {
  dialogsBootstrapCache.set(getDialogsBootstrapCacheKey(userId, search), {
    expiresAt: Date.now() + DIALOGS_BOOTSTRAP_TTL_MS,
    payload
  });
}

function getDialogsBootstrapCache(userId, search) {
  const key = getDialogsBootstrapCacheKey(userId, search);
  const cached = dialogsBootstrapCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    dialogsBootstrapCache.delete(key);
    return null;
  }
  return cached.payload;
}

async function fetchPresencePayload() {
  const result = await query('SELECT id, last_seen_at FROM users');
  return {
    onlineUserIds: [...onlineUsers.keys()],
    lastSeenMap: Object.fromEntries(result.rows.map((row) => [String(row.id), row.last_seen_at || null]))
  };
}

async function fetchUsersList(currentUserId, search = '') {
  const currentUser = await getUserById(currentUserId);
  if (!currentUser) return [];
  const normalizedSearch = normalizePhone(search || '');
  const result = await query(
    `WITH viewer_blocks AS (
        SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
      ),
      blocked_me AS (
        SELECT blocker_id FROM user_blocks WHERE blocked_id = $1
      ),
      last_messages AS (
        SELECT DISTINCT ON (private_dialog_id)
          private_dialog_id AS dialog_id,
          text,
          created_at,
          sender_id,
          deleted_at,
          attachment_type,
          attachment_name
        FROM (
          SELECT
            CASE
              WHEN m.group_id IS NOT NULL THEN NULL
              WHEN m.sender_id < m.recipient_id THEN m.sender_id || ':' || m.recipient_id
              ELSE m.recipient_id || ':' || m.sender_id
            END AS private_dialog_id,
            m.text,
            m.created_at,
            m.sender_id,
            m.deleted_at,
            m.attachment_type,
            m.attachment_name
          FROM messages m
        ) private_messages
        WHERE private_dialog_id IS NOT NULL
        ORDER BY private_dialog_id, created_at DESC
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

  return result.rows
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
      if (normalizedSearch) return user.phone && normalizePhone(user.phone).includes(normalizedSearch);
      return user.hasDialog || user.isBlocked;
    });
}

async function fetchGroupsList(currentUserId) {
  const currentUser = await getUserById(currentUserId);
  if (!currentUser) return [];
  const result = await query(
    `WITH memberships AS (
        SELECT gm.group_id
        FROM group_members gm
        WHERE gm.user_id = $1
      ),
      last_messages AS (
        SELECT DISTINCT ON (m.group_id)
          m.group_id,
          m.text,
          m.created_at,
          m.sender_id,
          m.deleted_at,
          m.attachment_type,
          m.attachment_name
        FROM messages m
        INNER JOIN memberships ms ON ms.group_id = m.group_id
        WHERE m.group_id IS NOT NULL
        ORDER BY m.group_id, m.created_at DESC
      ),
      unread_counts AS (
        SELECT m.group_id, COUNT(*)::int AS unread_count
        FROM messages m
        INNER JOIN memberships ms ON ms.group_id = m.group_id
        LEFT JOIN group_read_state grs ON grs.group_id = m.group_id AND grs.user_id = $1
        WHERE m.group_id IS NOT NULL
          AND m.sender_id <> $1
          AND m.deleted_at IS NULL
          AND m.created_at > COALESCE(grs.last_read_at, TO_TIMESTAMP(0))
        GROUP BY m.group_id
      ),
      members_agg AS (
        SELECT gm.group_id, ARRAY_AGG(gm.user_id ORDER BY gm.created_at ASC) AS member_ids
        FROM group_members gm
        INNER JOIN memberships ms ON ms.group_id = gm.group_id
        GROUP BY gm.group_id
      )
     SELECT g.*, lm.text AS last_message_text, lm.created_at AS last_message_created_at,
            lm.sender_id AS last_message_sender_id, lm.deleted_at AS last_message_deleted_at,
            lm.attachment_type AS last_message_attachment_type, lm.attachment_name AS last_message_attachment_name,
            COALESCE(uc.unread_count, 0) AS unread_count, ma.member_ids
     FROM groups g
     INNER JOIN memberships ms ON ms.group_id = g.id
     LEFT JOIN last_messages lm ON lm.group_id = g.id
     LEFT JOIN unread_counts uc ON uc.group_id = g.id
     LEFT JOIN members_agg ma ON ma.group_id = g.id
     ORDER BY COALESCE(lm.created_at, g.created_at) DESC, g.name ASC`,
    [currentUserId]
  );

  return result.rows.map((row) => ({
    id: `group:${row.id}`,
    rawId: row.id,
    type: 'group',
    name: row.name,
    photo: row.photo || '',
    memberIds: row.member_ids || [],
    unreadCount: Number(row.unread_count || 0),
    lastMessage: row.last_message_created_at ? {
      text: row.last_message_deleted_at ? 'Сообщение удалено' : row.last_message_text,
      createdAt: row.last_message_created_at,
      senderId: String(row.last_message_sender_id),
      deletedAt: row.last_message_deleted_at || null,
      attachmentType: row.last_message_attachment_type || '',
      attachmentName: row.last_message_attachment_name || ''
    } : null
  }));
}

async function buildDialogsBootstrapPayload(currentUserId, search = '') {
  const [users, groups, presence] = await Promise.all([
    fetchUsersList(currentUserId, search),
    fetchGroupsList(currentUserId),
    fetchPresencePayload()
  ]);
  return { users, groups, ...presence, generatedAt: new Date().toISOString() };
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NULL
    );
  `);

  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS show_phone BOOLEAN NOT NULL DEFAULT TRUE`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NULL`);

  await query(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (blocker_id, blocked_id)
    );
  `);

  const userBlocksColumnsResult = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_blocks'
  `);
  const userBlocksColumns = new Set(userBlocksColumnsResult.rows.map((row) => String(row.column_name)));

  async function renameLegacyUserBlocksColumn(legacyNames, targetName) {
    if (userBlocksColumns.has(targetName)) return;
    const legacyName = legacyNames.find((name) => userBlocksColumns.has(name));
    if (legacyName) {
      await query(`ALTER TABLE user_blocks RENAME COLUMN "${legacyName}" TO "${targetName}"`);
      userBlocksColumns.delete(legacyName);
      userBlocksColumns.add(targetName);
      return;
    }
    await query(`ALTER TABLE user_blocks ADD COLUMN IF NOT EXISTS "${targetName}" TEXT`);
    userBlocksColumns.add(targetName);
  }

  await renameLegacyUserBlocksColumn(['blocker_phone', 'user_id', 'owner_id', 'blocker'], 'blocker_id');
  await renameLegacyUserBlocksColumn(['blocked_phone', 'target_user_id', 'blocked_user_id', 'blocked'], 'blocked_id');

  if (!userBlocksColumns.has('created_at')) {
    await query(`ALTER TABLE user_blocks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    userBlocksColumns.add('created_at');
  }

  await query(`CREATE UNIQUE INDEX IF NOT EXISTS user_blocks_blocker_blocked_uidx ON user_blocks(blocker_id, blocked_id)`);
  await query(`CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON user_blocks(blocker_id)`);
  await query(`CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON user_blocks(blocked_id)`);


  await query(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (group_id, user_id)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS group_read_state (
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMPTZ NULL,
      PRIMARY KEY (group_id, user_id)
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

  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id TEXT NULL REFERENCES groups(id) ON DELETE CASCADE;`);
  await query(`ALTER TABLE groups ADD COLUMN IF NOT EXISTS photo TEXT NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT NOT NULL DEFAULT '';`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id TEXT NULL;`);

  await query(`
    CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
      mime_type TEXT NOT NULL,
      original_name TEXT NOT NULL DEFAULT '',
      size_bytes BIGINT NOT NULL DEFAULT 0,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  if (secondaryPool) {
    await secondaryQuery(`
      CREATE TABLE IF NOT EXISTS media_blobs (
        id TEXT PRIMARY KEY,
        data BYTEA NOT NULL,
        size_bytes BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_id TEXT NULL REFERENCES media_files(id) ON DELETE SET NULL;`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id TEXT NULL REFERENCES messages(id) ON DELETE SET NULL;`);

  await query(`
    CREATE TABLE IF NOT EXISTS message_audio_plays (
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (message_id, user_id)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS avatar_suggestions (
      message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
      target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      responded_at TIMESTAMPTZ NULL
    );
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_messages_dialog_id_created_at ON messages(dialog_id, created_at DESC);');
  await query('CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, read_at, deleted_at);');
  await query('CREATE INDEX IF NOT EXISTS idx_messages_group_created_at ON messages(group_id, created_at DESC);');
  await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_dedupe ON messages(sender_id, dialog_id, client_message_id) WHERE client_message_id IS NOT NULL');
}

async function getUserById(userId) {
  const result = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [String(userId)]);
  return mapUserRow(result.rows[0]);
}

async function getUserByPhone(phone) {
  const result = await query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [normalizePhone(phone)]);
  return mapUserRow(result.rows[0]);
}

async function getGroupById(groupId) {
  const result = await query('SELECT * FROM groups WHERE id = $1 LIMIT 1', [String(groupId)]);
  return result.rows[0] || null;
}

async function getGroupMemberIds(groupId) {
  const result = await query('SELECT user_id FROM group_members WHERE group_id = $1 ORDER BY created_at ASC', [String(groupId)]);
  return result.rows.map((row) => String(row.user_id));
}

async function getEligibleDialogUsers(currentUserId, { excludeGroupId = '' } = {}) {
  const params = [String(currentUserId)];
  let excludeSql = '';
  if (excludeGroupId) {
    params.push(String(excludeGroupId));
    excludeSql = ' AND u.id NOT IN (SELECT gm.user_id FROM group_members gm WHERE gm.group_id = $2)';
  }
  const result = await query(
    `WITH viewer_blocks AS (
        SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
      ),
      blocked_me AS (
        SELECT blocker_id FROM user_blocks WHERE blocked_id = $1
      ),
      dialog_users AS (
        SELECT DISTINCT CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END AS user_id
        FROM messages m
        WHERE m.group_id IS NULL
          AND (m.sender_id = $1 OR m.recipient_id = $1)
      )
     SELECT u.*
     FROM users u
     INNER JOIN dialog_users du ON du.user_id = u.id
     LEFT JOIN viewer_blocks vb ON vb.blocked_id = u.id
     LEFT JOIN blocked_me bm ON bm.blocker_id = u.id
     WHERE u.id <> $1
       AND vb.blocked_id IS NULL
       AND bm.blocker_id IS NULL` + excludeSql + `
     ORDER BY u.name ASC`,
    params
  );
  return result.rows.map((row) => publicUser(mapUserRow(row), currentUserId));
}


const OFFICE_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint.presentation.macroenabled.12',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'application/vnd.ms-word.document.macroenabled.12',
  'application/rtf',
  'text/rtf',
  'application/pdf',
  'text/plain',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation'
]);

const OFFICE_EXTENSIONS = new Set(['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf', '.pdf', '.txt', '.odt', '.ods', '.odp']);

function detectAttachmentType(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  const originalName = String(file?.originalname || '');
  const ext = path.extname(originalName).toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (OFFICE_MIME_TYPES.has(mime) || OFFICE_EXTENSIONS.has(ext)) return 'document';
  return '';
}

const MESSAGE_REPLY_SELECT = `
  rm.id AS reply_preview_message_id,
  rm.text AS reply_preview_text,
  rm.attachment_type AS reply_preview_attachment_type,
  rm.deleted_at AS reply_preview_deleted_at,
  rm.sender_id AS reply_preview_sender_id,
  rsu.name AS reply_preview_sender_name
`;

async function resolveReplyTargetMessage(currentUserId, { replyToMessageId = '', recipientId = '', groupId = '' } = {}) {
  const messageId = String(replyToMessageId || '').trim();
  if (!messageId) return null;
  const result = await query(
    `SELECT m.*
     FROM messages m
     WHERE m.id = $1
       AND (
         ($2 <> '' AND m.group_id = $2)
         OR (
           $2 = ''
           AND m.group_id IS NULL
           AND $3 <> ''
           AND ((m.sender_id = $4 AND m.recipient_id = $3) OR (m.sender_id = $3 AND m.recipient_id = $4))
         )
       )
     LIMIT 1`,
    [messageId, String(groupId || ''), String(recipientId || ''), String(currentUserId || '')]
  );
  return result.rows[0] || null;
}

async function getFullMessageById(messageId) {
  const result = await query(
    `SELECT
        m.*,
        su.name AS sender_name,
        su.phone AS sender_phone,
        ru.name AS recipient_name,
        ru.phone AS recipient_phone,
        g.name AS group_name,
        avs.status AS avatar_suggestion_status,
        avs.target_user_id AS avatar_suggestion_target_user_id,
        ${MESSAGE_REPLY_SELECT}
     FROM messages m
     INNER JOIN users su ON su.id = m.sender_id
     LEFT JOIN users ru ON ru.id = m.recipient_id
     LEFT JOIN groups g ON g.id = m.group_id
     LEFT JOIN avatar_suggestions avs ON avs.message_id = m.id
     LEFT JOIN messages rm ON rm.id = m.reply_to_message_id
     LEFT JOIN users rsu ON rsu.id = rm.sender_id
     WHERE m.id = $1`,
    [String(messageId)]
  );
  return mapMessageRow(result.rows[0]);
}

async function broadcastMessageEvent(eventName, message) {
  if (!message) return;
  if (message.isGroup && message.groupId) {
    const memberIds = await getGroupMemberIds(message.groupId);
    memberIds.forEach((userId) => {
      io.to(`user:${userId}`).emit(eventName, message);
    });
    return;
  }
  io.to(`user:${message.senderId}`).to(`user:${message.recipientId}`).emit(eventName, message);
}

function emitTypingEvent(eventName, { senderId, recipientId = '', groupId = '', dialogId = '', userName = '' } = {}) {
  const payload = {
    userId: senderId ? String(senderId) : '',
    recipientId: recipientId ? String(recipientId) : '',
    groupId: groupId ? String(groupId) : '',
    dialogId: dialogId ? String(dialogId) : '',
    userName: String(userName || '')
  };
  if (payload.groupId) {
    io.to(`group:${payload.groupId}`).emit(eventName, payload);
    return;
  }
  if (payload.recipientId) {
    io.to(`user:${payload.recipientId}`).emit(eventName, payload);
  }
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

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

app.use(cors({
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((item) => item.trim()).filter(Boolean),
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));

// Legacy compatibility for old files that were already saved on disk before the DB migration.
// No new uploads are written there anymore.
app.use('/uploads', express.static(UPLOADS_DIR, { fallthrough: true }));
app.get('/api/media/:mediaId', async (req, res) => {
  try {
    const mediaId = String(req.params.mediaId || '');
    if (!mediaId) return res.status(400).json({ error: 'Не указан файл' });
    const media = await getMediaById(mediaId);
    if (!media) return res.status(404).json({ error: 'Файл не найден' });

    const buffer = media.data;
    const totalSize = Number(media.size_bytes || (buffer ? buffer.length : 0));
    const mimeType = media.mime_type || 'application/octet-stream';
    const rangeHeader = req.headers.range;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (media.original_name) {
      const safeName = String(media.original_name).replace(/[\r\n"]/g, '_');
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    }

    if (rangeHeader && totalSize > 0) {
      const match = String(rangeHeader).match(/bytes=(\d*)-(\d*)/);
      const startByte = match && match[1] !== '' ? Number(match[1]) : 0;
      const requestedEnd = match && match[2] !== '' ? Number(match[2]) : totalSize - 1;
      const endByte = Math.min(requestedEnd, totalSize - 1);

      if (!Number.isFinite(startByte) || !Number.isFinite(endByte) || startByte < 0 || endByte < startByte || startByte >= totalSize) {
        res.setHeader('Content-Range', `bytes */${totalSize}`);
        return res.status(416).end();
      }

      const chunk = buffer.subarray(startByte, endByte + 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${startByte}-${endByte}/${totalSize}`);
      res.setHeader('Content-Length', String(chunk.length));
      return res.end(chunk);
    }

    res.setHeader('Content-Length', String(totalSize));
    return res.end(buffer);
  } catch (error) {
    console.error('media read error', error);
    return res.status(500).json({ error: 'Не удалось получить файл' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

console.log('[media] New uploads use PostgreSQL storage; local /uploads is legacy read-only compatibility.');
console.log(`[db] Secondary database ${secondaryPool ? 'enabled' : 'disabled'}${secondaryPool ? ' for media blobs' : ''}.`);

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
    invalidateDialogsBootstrapCache([user.id]);
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
    invalidateDialogsBootstrapCache([user.id]);
    res.json({ user: publicUser(user, user.id, blockedUserIds) });
  } catch (error) {
    console.error('profile update error', error);
    res.status(500).json({ error: 'Не удалось обновить профиль' });
  }
});

app.post('/api/profile/photo', memoryUpload.single('photo'), async (req, res) => {
  try {
    const userId = String(req.body.userId || '');
    const existing = await getUserById(userId);
    if (!existing) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Фото не загружено' });
    }

    const file = req.file;
    const mediaId = crypto.randomUUID();
    await storeMediaFile({
      mediaId,
      ownerUserId: userId,
      mimeType: String(file.mimetype || 'application/octet-stream'),
      originalName: String(file.originalname || 'avatar'),
      sizeBytes: Number(file.size || 0),
      data: file.buffer
    });

    await query('UPDATE users SET photo = $2 WHERE id = $1', [userId, `/api/media/${mediaId}`]);
    const user = await getUserById(userId);
    const blockedUserIds = await getBlockedIds(user.id);
    io.emit('user:updated', publicUser(user));
    invalidateDialogsBootstrapCache([user.id]);
    res.json({ user: publicUser(user, user.id, blockedUserIds) });
  } catch (error) {
    console.error('photo upload error', error);
    if (String(error?.code || '') === 'ENOSPC') {
      return res.status(507).json({ error: 'На сервере закончилось место для временных файлов' });
    }
    res.status(500).json({ error: error.message || 'Не удалось загрузить фото' });
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
    invalidateDialogsBootstrapCache([currentUserId, otherUserId]);
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
    invalidateDialogsBootstrapCache([currentUserId, otherUserId]);
    res.json({ user: publicUser(currentUser, currentUserId, blockedUserIds) });
  } catch (error) {
    console.error('unblock error', error);
    res.status(500).json({ error: 'Не удалось удалить из черного списка' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const search = String(req.query.search || '');
    const users = await fetchUsersList(currentUserId, search);
    res.json({ users });
  } catch (error) {
    console.error('users error', error);
    res.status(500).json({ error: 'Не удалось получить список пользователей' });
  }
});

app.get('/api/groups', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const groups = await fetchGroupsList(currentUserId);
    res.json({ groups });
  } catch (error) {
    console.error('groups error', error);
    res.status(500).json({ error: 'Не удалось получить беседы' });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const currentUserId = String(req.body?.currentUserId || '');
    const name = String(req.body?.name || '').trim();
    const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds.map((id) => String(id)) : [];
    if (!name || name.length < 2) return res.status(400).json({ error: 'Введите название беседы' });
    const currentUser = await getUserById(currentUserId);
    if (!currentUser) return res.status(404).json({ error: 'Пользователь не найден' });

    const uniqueMemberIds = [...new Set([currentUserId, ...memberIds])];
    if (uniqueMemberIds.length < 2) return res.status(400).json({ error: 'Выберите хотя бы одного участника' });

    const eligibleUsers = await getEligibleDialogUsers(currentUserId);
    const eligibleIds = new Set(eligibleUsers.map((user) => String(user.id)));
    const invalidMemberId = uniqueMemberIds.find((id) => id !== currentUserId && !eligibleIds.has(String(id)));
    if (invalidMemberId) return res.status(400).json({ error: 'Можно добавить только пользователей, с которыми у вас уже есть диалог' });

    const groupId = crypto.randomUUID();
    await query('INSERT INTO groups (id, name, created_by, photo) VALUES ($1, $2, $3, $4)', [groupId, name, currentUserId, '']);
    for (const userId of uniqueMemberIds) {
      await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, userId]);
      await query('INSERT INTO group_read_state (group_id, user_id, last_read_at) VALUES ($1, $2, NOW()) ON CONFLICT (group_id, user_id) DO NOTHING', [groupId, userId]);
    }

    const group = await getGroupById(groupId);
    const responseGroup = {
      id: `group:${group.id}`,
      rawId: group.id,
      type: 'group',
      name: group.name,
      photo: group.photo || '',
      memberIds: uniqueMemberIds,
      hasDialog: true,
      canMessage: true,
      unreadCount: 0,
      lastMessage: null
    };
    uniqueMemberIds.forEach((userId) => io.to(`user:${userId}`).emit('group:updated', responseGroup));
    res.json({ group: responseGroup });
  } catch (error) {
    console.error('group create error', error);
    res.status(500).json({ error: 'Не удалось создать беседу' });
  }
});


app.post('/api/groups/:groupId/members', async (req, res) => {
  try {
    const currentUserId = String(req.body?.currentUserId || '');
    const groupId = String(req.params.groupId || '');
    const memberIds = Array.isArray(req.body?.memberIds) ? [...new Set(req.body.memberIds.map((id) => String(id)).filter(Boolean))] : [];
    if (!memberIds.length) return res.status(400).json({ error: 'Выберите хотя бы одного участника' });

    const currentUser = await getUserById(currentUserId);
    if (!currentUser) return res.status(404).json({ error: 'Пользователь не найден' });
    const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [groupId, currentUserId]);
    if (!membership.rowCount) return res.status(403).json({ error: 'Нет доступа к этой беседе' });

    const eligibleUsers = await getEligibleDialogUsers(currentUserId, { excludeGroupId: groupId });
    const eligibleIds = new Set(eligibleUsers.map((user) => String(user.id)));
    const invalidMemberId = memberIds.find((id) => !eligibleIds.has(String(id)));
    if (invalidMemberId) return res.status(400).json({ error: 'Можно добавить только пользователей, с которыми у вас уже есть диалог и которых ещё нет в беседе' });

    for (const userId of memberIds) {
      await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, userId]);
      await query('INSERT INTO group_read_state (group_id, user_id, last_read_at) VALUES ($1, $2, NOW()) ON CONFLICT (group_id, user_id) DO NOTHING', [groupId, userId]);
    }

    const group = await getGroupById(groupId);
    const updatedMemberIds = await getGroupMemberIds(groupId);
    const responseGroup = {
      id: `group:${group.id}`,
      rawId: group.id,
      type: 'group',
      name: group.name,
      photo: '',
      memberIds: updatedMemberIds,
      hasDialog: true,
      canMessage: true,
      unreadCount: 0,
      lastMessage: null
    };
    updatedMemberIds.forEach((userId) => io.to(`user:${userId}`).emit('group:updated', responseGroup));
    res.json({ group: responseGroup, addedMemberIds: memberIds });
  } catch (error) {
    console.error('group add members error', error);
    res.status(500).json({ error: 'Не удалось добавить участников' });
  }
});


app.post('/api/groups/:groupId/photo', memoryUpload.single('photo'), async (req, res) => {
  try {
    const currentUserId = String(req.body?.currentUserId || '');
    const groupId = String(req.params.groupId || '');
    const file = req.file;
    if (!currentUserId || !groupId) return res.status(400).json({ error: 'Не выбрана беседа' });
    if (!file) return res.status(400).json({ error: 'Фото не загружено' });
    if (!String(file.mimetype || '').startsWith('image/')) return res.status(400).json({ error: 'Для фото беседы можно выбрать только изображение' });

    const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [groupId, currentUserId]);
    if (!membership.rowCount) return res.status(403).json({ error: 'Нет доступа к этой беседе' });

    const mediaId = crypto.randomUUID();
    await storeMediaFile({
      mediaId,
      ownerUserId: currentUserId,
      mimeType: String(file.mimetype || 'application/octet-stream'),
      originalName: String(file.originalname || ''),
      sizeBytes: Number(file.size || 0),
      data: file.buffer
    });

    const photoUrl = `/api/media/${mediaId}`;
    await query('UPDATE groups SET photo = $2 WHERE id = $1', [groupId, photoUrl]);

    const group = await getGroupById(groupId);
    const memberIds = await getGroupMemberIds(groupId);
    const payload = {
      id: `group:${group.id}`,
      rawId: group.id,
      type: 'group',
      name: group.name,
      photo: group.photo || '',
      memberIds,
      hasDialog: true,
      canMessage: true,
      unreadCount: 0,
      lastMessage: null
    };
    memberIds.forEach((userId) => io.to(`user:${userId}`).emit('group:updated', payload));
    res.json({ group: payload });
  } catch (error) {
    console.error('group photo upload error', error);
    res.status(500).json({ error: 'Не удалось обновить фото беседы' });
  }
});

app.get('/api/groups/:groupId/messages', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const groupId = String(req.params.groupId || '');
    const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [groupId, currentUserId]);
    if (!membership.rowCount) return res.status(403).json({ error: 'Нет доступа к этой беседе' });

    const result = await query(
      `SELECT m.*, su.name AS sender_name, su.phone AS sender_phone, '' AS recipient_name, '' AS recipient_phone, g.name AS group_name,
              ${MESSAGE_REPLY_SELECT},
              EXISTS (
                SELECT 1
                FROM message_audio_plays map
                WHERE map.message_id = m.id
                  AND map.user_id = $2
              ) AS audio_listened,
              avs.status AS avatar_suggestion_status,
              avs.target_user_id AS avatar_suggestion_target_user_id
       FROM messages m
       INNER JOIN users su ON su.id = m.sender_id
       INNER JOIN groups g ON g.id = m.group_id
       LEFT JOIN avatar_suggestions avs ON avs.message_id = m.id
       LEFT JOIN messages rm ON rm.id = m.reply_to_message_id
       LEFT JOIN users rsu ON rsu.id = rm.sender_id
       WHERE m.group_id = $1
       ORDER BY m.created_at ASC`,
      [groupId, currentUserId]
    );

    await query(
      `INSERT INTO group_read_state (group_id, user_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_at = NOW()`,
      [groupId, currentUserId]
    );

    res.json({ messages: result.rows.map(mapMessageRow), canMessage: true, isBlocked: false, blockedByUser: false });
  } catch (error) {
    console.error('group messages fetch error', error);
    res.status(500).json({ error: 'Не удалось получить сообщения беседы' });
  }
});

app.post('/api/messages/:messageId/listen', async (req, res) => {
  try {
    const currentUserId = String(req.body?.currentUserId || req.query.currentUserId || '');
    const messageId = String(req.params.messageId || '');
    if (!currentUserId || !messageId) return res.status(400).json({ error: 'Недостаточно данных' });

    const messageResult = await query('SELECT * FROM messages WHERE id = $1 LIMIT 1', [messageId]);
    if (!messageResult.rowCount) return res.status(404).json({ error: 'Сообщение не найдено' });
    const message = messageResult.rows[0];
    if (message.attachment_type !== 'audio') return res.json({ ok: true, listened: false });

    let hasAccess = false;
    if (message.group_id) {
      const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [message.group_id, currentUserId]);
      hasAccess = membership.rowCount > 0;
    } else {
      hasAccess = String(message.sender_id) === currentUserId || String(message.recipient_id) === currentUserId;
    }
    if (!hasAccess) return res.status(403).json({ error: 'Нет доступа к сообщению' });

    await query(
      `INSERT INTO message_audio_plays (message_id, user_id, listened_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (message_id, user_id) DO UPDATE SET listened_at = EXCLUDED.listened_at`,
      [messageId, currentUserId]
    );

    const payload = await getFullMessageById(messageId);
    if (payload) {
      const eventPayload = { messageId, userId: currentUserId, message: payload };
      if (payload.isGroup && payload.groupId) {
        const memberIds = await getGroupMemberIds(payload.groupId);
        memberIds.forEach((userId) => io.to(`user:${userId}`).emit('message:audio-listened', eventPayload));
      } else {
        io.to(`user:${payload.senderId}`).to(`user:${payload.recipientId}`).emit('message:audio-listened', eventPayload);
      }
    }

    res.json({ ok: true, listened: true, message: payload || null });
  } catch (error) {
    console.error('message listen error', error);
    res.status(500).json({ error: 'Не удалось обновить статус прослушивания' });
  }
});

app.get('/api/users/all', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const currentUser = await getUserById(currentUserId);
    if (!currentUser) return res.json({ users: [] });
    const result = await query('SELECT * FROM users WHERE id <> $1 ORDER BY name ASC', [currentUserId]);
    res.json({ users: result.rows.map((row) => publicUser(mapUserRow(row), currentUserId)) });
  } catch (error) {
    console.error('all users error', error);
    res.status(500).json({ error: 'Не удалось получить пользователей' });
  }
});


app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const targetUserId = String(req.params.userId || '');
    if (!currentUserId || !targetUserId) {
      return res.status(400).json({ error: 'Не указан пользователь' });
    }

    const [currentUser, targetUser] = await Promise.all([
      getUserById(currentUserId),
      getUserById(targetUserId)
    ]);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const relationResult = await query(
      `SELECT
         EXISTS (
           SELECT 1
           FROM messages m
           WHERE m.group_id IS NULL
             AND ((m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1))
         ) AS has_dialog,
         EXISTS (SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2) AS is_blocked,
         EXISTS (SELECT 1 FROM user_blocks WHERE blocker_id = $2 AND blocked_id = $1) AS blocked_by_user`,
      [currentUserId, targetUserId]
    );

    const relation = relationResult.rows[0] || {};
    if (currentUserId !== targetUserId && !relation.has_dialog && !relation.is_blocked && !relation.blocked_by_user) {
      return res.status(403).json({ error: 'Профиль доступен только для собеседников из ваших диалогов' });
    }

    res.json({
      user: {
        ...publicUser(targetUser, currentUserId),
        createdAt: targetUser.createdAt,
        hasDialog: Boolean(relation.has_dialog),
        isBlocked: Boolean(relation.is_blocked),
        blockedByUser: Boolean(relation.blocked_by_user)
      }
    });
  } catch (error) {
    console.error('user profile error', error);
    res.status(500).json({ error: 'Не удалось получить профиль пользователя' });
  }
});

app.delete('/api/dialogs/:otherUserId', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const otherUserId = String(req.params.otherUserId || '');
    if (!currentUserId || !otherUserId) return res.status(400).json({ error: 'Не выбран диалог' });
    if (currentUserId === otherUserId) return res.status(400).json({ error: 'Нельзя удалить диалог с самим собой' });

    const currentUser = await getUserById(currentUserId);
    const otherUser = await getUserById(otherUserId);
    if (!currentUser || !otherUser) return res.status(404).json({ error: 'Диалог не найден' });

    const dialogId = makeDialogId(currentUserId, otherUserId);
    await query('DELETE FROM messages WHERE dialog_id = $1 AND group_id IS NULL', [dialogId]);
    invalidateDialogsBootstrapCache([currentUserId, otherUserId]);
    io.to(`user:${currentUserId}`).to(`user:${otherUserId}`).emit('dialog:deleted', { dialogId, byUserId: currentUserId });
    return res.json({ ok: true, dialogId });
  } catch (error) {
    console.error('dialog delete error', error);
    return res.status(500).json({ error: 'Не удалось удалить диалог' });
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
          ru.phone AS recipient_phone,
          EXISTS (
            SELECT 1
            FROM message_audio_plays map
            WHERE map.message_id = m.id
              AND map.user_id = CASE
                WHEN m.sender_id = $2 THEN m.recipient_id
                ELSE $2
              END
          ) AS audio_listened,
          avs.status AS avatar_suggestion_status,
          avs.target_user_id AS avatar_suggestion_target_user_id,
          ${MESSAGE_REPLY_SELECT}
       FROM messages m
       INNER JOIN users su ON su.id = m.sender_id
       INNER JOIN users ru ON ru.id = m.recipient_id
       LEFT JOIN avatar_suggestions avs ON avs.message_id = m.id
       LEFT JOIN messages rm ON rm.id = m.reply_to_message_id
       LEFT JOIN users rsu ON rsu.id = rm.sender_id
       WHERE m.dialog_id = $1
       ORDER BY m.created_at ASC`,
      [dialogId, currentUserId]
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

    const payload = await getFullMessageById(messageId);
    await broadcastMessageEvent('message:updated', payload);
    if (payload?.isGroup && payload.groupId) {
      const membersResult = await query('SELECT user_id FROM group_members WHERE group_id = $1', [payload.groupId]);
      invalidateDialogsBootstrapCache(membersResult.rows.map((row) => String(row.user_id)));
    } else {
      invalidateDialogsBootstrapCache([payload?.senderId, payload?.recipientId]);
    }
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

    const payload = await getFullMessageById(messageId);
    await broadcastMessageEvent('message:deleted', payload);
    if (payload?.isGroup && payload.groupId) {
      const membersResult = await query('SELECT user_id FROM group_members WHERE group_id = $1', [payload.groupId]);
      invalidateDialogsBootstrapCache(membersResult.rows.map((row) => String(row.user_id)));
    } else {
      invalidateDialogsBootstrapCache([payload?.senderId, payload?.recipientId]);
    }
    res.json({ message: payload });
  } catch (error) {
    console.error('message delete error', error);
    res.status(500).json({ error: 'Не удалось удалить сообщение' });
  }
});


app.post('/api/messages/upload', memoryUpload.single('file'), async (req, res) => {
  try {
    const senderId = String(req.body?.currentUserId || '');
    const recipientId = String(req.body?.recipientId || '');
    const groupId = String(req.body?.groupId || '');
    const text = String(req.body?.text || '').trim();
    const clientMessageId = String(req.body?.clientMessageId || '').trim() || null;
    const replyToMessageId = String(req.body?.replyToMessageId || '').trim();
    const file = req.file;

    if (!senderId || (!recipientId && !groupId)) {
      return res.status(400).json({ error: 'Не выбран получатель' });
    }
    if (!file) {
      return res.status(400).json({ error: 'Файл не был загружен' });
    }

    const sender = await getUserById(senderId);
    if (!sender) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    let dialogId = '';
    let storedRecipientId = senderId;
    let deliveredAt = null;

    if (groupId) {
      const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [groupId, senderId]);
      if (!membership.rowCount) return res.status(403).json({ error: 'Нет доступа к этой беседе' });
      dialogId = `group:${groupId}`;
      await query(
        `INSERT INTO group_read_state (group_id, user_id, last_read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_at = NOW()`,
        [groupId, senderId]
      );
    } else {
      const recipient = await getUserById(recipientId);
      if (!recipient) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      if (await areUsersBlocked(sender.id, recipient.id)) {
        return res.status(403).json({ error: 'Отправка сообщений недоступна' });
      }
      dialogId = makeDialogId(sender.id, recipient.id);
      storedRecipientId = String(recipient.id);
      deliveredAt = onlineUsers.has(String(recipient.id)) ? new Date().toISOString() : null;
    }

    const replyTarget = await resolveReplyTargetMessage(senderId, { replyToMessageId, recipientId: recipientId || storedRecipientId, groupId });

    const attachmentType = detectAttachmentType(file);
    if (!attachmentType) {
      return res.status(400).json({ error: 'Можно отправлять фото, видео, голосовые и Office-файлы' });
    }

    const messageId = crypto.randomUUID();
    const mediaId = crypto.randomUUID();

    await storeMediaFile({
      mediaId,
      ownerUserId: String(sender.id),
      mimeType: String(file.mimetype || 'application/octet-stream'),
      originalName: String(file.originalname || ''),
      sizeBytes: Number(file.size || 0),
      data: file.buffer
    });

    try {
      await query(
        `INSERT INTO messages (
          id, dialog_id, text, sender_id, recipient_id, delivered_at, read_at, edited_at, deleted_at, attachment_url, attachment_type, attachment_name, group_id, media_id, client_message_id, reply_to_message_id
        ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, '', $7, $8, $9, $10, $11, $12)`,
        [messageId, dialogId, text, String(sender.id), storedRecipientId, deliveredAt, attachmentType, file.originalname || '', groupId || null, mediaId, clientMessageId, replyTarget?.id || null]
      );
    } catch (insertError) {
      if (String(insertError?.code || '') === '23505' && clientMessageId) {
        await deleteMediaById(mediaId);
        const existing = await query(
          'SELECT id FROM messages WHERE sender_id = $1 AND dialog_id = $2 AND client_message_id = $3 LIMIT 1',
          [String(sender.id), dialogId, clientMessageId]
        );
        const existingId = existing.rows[0]?.id;
        if (existingId) {
          const existingMessage = await getFullMessageById(existingId);
          return res.json({ message: existingMessage, duplicate: true });
        }
      }
      throw insertError;
    }

    const message = await getFullMessageById(messageId);
    await broadcastMessageEvent('private-message', message);
    const cacheTargets = groupId
      ? [String(sender.id), ...await getGroupMemberIds(groupId)]
      : [String(sender.id), String(storedRecipientId)];
    invalidateDialogsBootstrapCache(cacheTargets);
    res.json({ message });
  } catch (error) {
    console.error('message upload error', error);
    if (String(error?.code || '') === '23505') {
      return res.status(409).json({ error: 'Файл уже был отправлен' });
    }
    if (String(error?.code || '') === 'ENOSPC') {
      return res.status(507).json({ error: 'На сервере закончилось место для временных файлов' });
    }
    return res.status(500).json({ error: error.message || 'Не удалось отправить файл' });
  }
});


app.post('/api/messages/avatar-suggestion', memoryUpload.single('photo'), async (req, res) => {
  try {
    const senderId = String(req.body?.currentUserId || '');
    const recipientId = String(req.body?.recipientId || '');
    const text = String(req.body?.text || '').trim();
    const clientMessageId = String(req.body?.clientMessageId || '').trim() || null;
    const file = req.file;
    if (!senderId || !recipientId) return res.status(400).json({ error: 'Не выбран получатель' });
    if (!file) return res.status(400).json({ error: 'Фото не загружено' });
    if (!String(file.mimetype || '').startsWith('image/')) return res.status(400).json({ error: 'Для предложения аватарки можно выбрать только изображение' });

    const sender = await getUserById(senderId);
    const recipient = await getUserById(recipientId);
    if (!sender || !recipient) return res.status(404).json({ error: 'Пользователь не найден' });
    if (await areUsersBlocked(sender.id, recipient.id)) return res.status(403).json({ error: 'Отправка сообщений недоступна' });

    const dialogId = makeDialogId(sender.id, recipient.id);
    const messageId = crypto.randomUUID();
    const mediaId = crypto.randomUUID();
    const deliveredAt = onlineUsers.has(String(recipient.id)) ? new Date().toISOString() : null;

    await storeMediaFile({
      mediaId,
      ownerUserId: String(sender.id),
      mimeType: String(file.mimetype || 'application/octet-stream'),
      originalName: String(file.originalname || ''),
      sizeBytes: Number(file.size || 0),
      data: file.buffer
    });

    try {
      await query(
        `INSERT INTO messages (
          id, dialog_id, text, sender_id, recipient_id, delivered_at, read_at, edited_at, deleted_at, attachment_url, attachment_type, attachment_name, media_id, client_message_id
         ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, '', 'avatar_suggestion', $7, $8, $9)`,
        [messageId, dialogId, text, String(sender.id), String(recipient.id), deliveredAt, file.originalname || '', mediaId, clientMessageId]
      );
    } catch (insertError) {
      if (String(insertError?.code || '') === '23505' && clientMessageId) {
        await deleteMediaById(mediaId);
        const existing = await query(
          'SELECT id FROM messages WHERE sender_id = $1 AND dialog_id = $2 AND client_message_id = $3 LIMIT 1',
          [String(sender.id), dialogId, clientMessageId]
        );
        const existingId = existing.rows[0]?.id;
        if (existingId) {
          const existingMessage = await getFullMessageById(existingId);
          return res.json({ message: existingMessage, duplicate: true });
        }
      }
      throw insertError;
    }

    await query(
      `INSERT INTO avatar_suggestions (message_id, target_user_id, status)
       VALUES ($1, $2, 'pending')`,
      [messageId, String(recipient.id)]
    );

    const message = await getFullMessageById(messageId);
    await broadcastMessageEvent('private-message', message);
    if (groupId) {
      const membersResult = await query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
      invalidateDialogsBootstrapCache(membersResult.rows.map((row) => String(row.user_id)));
    } else {
      invalidateDialogsBootstrapCache([String(sender.id), storedRecipientId]);
    }
    res.json({ message });
  } catch (error) {
    console.error('avatar suggestion send error', error);
    return res.status(500).json({ error: error.message || 'Не удалось отправить предложение аватарки' });
  }
});

app.post('/api/messages/:messageId/avatar-suggestion-response', async (req, res) => {
  try {
    const currentUserId = String(req.body?.currentUserId || '');
    const action = String(req.body?.action || '').toLowerCase();
    const messageId = String(req.params.messageId || '');
    if (!currentUserId || !messageId || !['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'Недостаточно данных' });

    const result = await query(
      `SELECT m.*, avs.target_user_id, avs.status
       FROM messages m
       INNER JOIN avatar_suggestions avs ON avs.message_id = m.id
       WHERE m.id = $1
       LIMIT 1`,
      [messageId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Предложение не найдено' });
    const message = result.rows[0];
    if (String(message.target_user_id) != currentUserId) return res.status(403).json({ error: 'Вы не можете отвечать на это предложение' });
    if (String(message.status) !== 'pending') {
      const payload = await getFullMessageById(messageId);
      return res.json({ message: payload, alreadyHandled: true });
    }

    const nextStatus = action === 'accept' ? 'accepted' : 'declined';
    await query(
      `UPDATE avatar_suggestions
       SET status = $2, responded_at = NOW()
       WHERE message_id = $1`,
      [messageId, nextStatus]
    );

    if (action === 'accept' && message.media_id) {
      await query('UPDATE users SET photo = $2 WHERE id = $1', [currentUserId, `/api/media/${message.media_id}`]);
      const updatedUser = await getUserById(currentUserId);
      const blockedUserIds = await getBlockedIds(currentUserId);
      io.emit('user:updated', publicUser(updatedUser, currentUserId, blockedUserIds));
    }

    const payload = await getFullMessageById(messageId);
    await broadcastMessageEvent('message:updated', payload);
    if (payload?.isGroup && payload.groupId) {
      const membersResult = await query('SELECT user_id FROM group_members WHERE group_id = $1', [payload.groupId]);
      invalidateDialogsBootstrapCache(membersResult.rows.map((row) => String(row.user_id)));
    } else {
      invalidateDialogsBootstrapCache([payload?.senderId, payload?.recipientId]);
    }
    res.json({ message: payload });
  } catch (error) {
    console.error('avatar suggestion response error', error);
    return res.status(500).json({ error: error.message || 'Не удалось обработать предложение аватарки' });
  }
});

const onlineUsers = new Map();

function emitPresence(userId, isOnline, lastSeenAt = null) {
  io.emit('presence:update', { userId, isOnline, lastSeenAt });
}

io.on('connection', (socket) => {
  socket.on('join-user', async (user) => {
    try {
      if (!user?.id) return;

      socket.data.user = user;
      socket.join(`user:${user.id}`);

      const groups = await query('SELECT group_id FROM group_members WHERE user_id = $1', [String(user.id)]);
      groups.rows.forEach((row) => socket.join(`group:${row.group_id}`));

      const count = onlineUsers.get(user.id) || 0;
      onlineUsers.set(user.id, count + 1);
      await query('UPDATE users SET last_seen_at = NULL WHERE id = $1', [String(user.id)]).catch(() => null);
      emitPresence(user.id, true, null);

      const delivered = await query(
        `UPDATE messages
         SET delivered_at = NOW()
         WHERE recipient_id = $1 AND delivered_at IS NULL AND group_id IS NULL
         RETURNING *`,
        [String(user.id)]
      );
      await enrichAndBroadcastMessageStatus(delivered.rows);
    } catch (error) {
      console.error('join-user error', error);
    }
  });

  socket.on('open-dialog', async ({ currentUserId, otherUserId, groupId }) => {
    try {
      const currentId = String(currentUserId || '');
      if (!currentId) return;
      if (groupId) {
        const normalizedGroupId = String(groupId || '');
        const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [normalizedGroupId, currentId]);
        if (!membership.rowCount) return;
        await query(
          `INSERT INTO group_read_state (group_id, user_id, last_read_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_at = NOW()`,
          [normalizedGroupId, currentId]
        );
        return;
      }

      const otherId = String(otherUserId || '');
      if (!otherId) return;
      if (await areUsersBlocked(currentId, otherId)) return;

      const dialogId = makeDialogId(currentId, otherId);
      const changed = await query(
        `UPDATE messages
         SET
           delivered_at = COALESCE(delivered_at, NOW()),
           read_at = COALESCE(read_at, NOW())
         WHERE dialog_id = $1
           AND recipient_id = $2
           AND group_id IS NULL
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
      const clientMessageId = String(payload.clientMessageId || '').trim() || null;
      const replyTarget = await resolveReplyTargetMessage(sender.id, { replyToMessageId: payload.replyToMessageId, recipientId: recipient.id });

      try {
        await query(
          `INSERT INTO messages (
            id, dialog_id, text, sender_id, recipient_id, delivered_at, read_at, edited_at, deleted_at, client_message_id, reply_to_message_id
           ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, $7, $8)`,
          [messageId, dialogId, String(payload.text).trim(), String(sender.id), String(recipient.id), recipientOnline ? new Date().toISOString() : null, clientMessageId, replyTarget?.id || null]
        );
      } catch (insertError) {
        if (String(insertError?.code || '') === '23505' && clientMessageId) return;
        throw insertError;
      }

      const message = await getFullMessageById(messageId);
      await broadcastMessageEvent('private-message', message);
    } catch (error) {
      console.error('send-private-message error', error);
    }
  });

  socket.on('send-group-message', async (payload) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser || !payload?.text?.trim() || !payload?.groupId) return;
      const sender = await getUserById(activeUser.id);
      if (!sender) return;
      const groupId = String(payload.groupId);
      const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [groupId, sender.id]);
      if (!membership.rowCount) return;

      const messageId = crypto.randomUUID();
      const clientMessageId = String(payload.clientMessageId || '').trim() || null;
      const replyTarget = await resolveReplyTargetMessage(sender.id, { replyToMessageId: payload.replyToMessageId, groupId });
      try {
        await query(
          `INSERT INTO messages (
            id, dialog_id, text, sender_id, recipient_id, delivered_at, read_at, edited_at, deleted_at, group_id, client_message_id, reply_to_message_id
           ) VALUES ($1, $2, $3, $4, $5, NULL, NULL, NULL, NULL, $6, $7, $8)`,
          [messageId, `group:${groupId}`, String(payload.text).trim(), String(sender.id), String(sender.id), groupId, clientMessageId, replyTarget?.id || null]
        );
      } catch (insertError) {
        if (String(insertError?.code || '') === '23505' && clientMessageId) return;
        throw insertError;
      }

      await query(
        `INSERT INTO group_read_state (group_id, user_id, last_read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (group_id, user_id) DO UPDATE SET last_read_at = NOW()`,
        [groupId, sender.id]
      );

      const message = await getFullMessageById(messageId);
      await broadcastMessageEvent('private-message', message);
    } catch (error) {
      console.error('send-group-message error', error);
    }
  });

  socket.on('typing:start', async (payload = {}) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser?.id) return;
      const sender = await getUserById(activeUser.id);
      if (!sender) return;
      const groupId = String(payload.groupId || '').trim();
      const recipientId = String(payload.recipientId || '').trim();
      if (groupId) {
        const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [groupId, sender.id]);
        if (!membership.rowCount) return;
        emitTypingEvent('typing:start', { senderId: sender.id, groupId, dialogId: `group:${groupId}`, userName: sender.name });
        return;
      }
      if (!recipientId) return;
      const recipient = await getUserById(recipientId);
      if (!recipient) return;
      if (await areUsersBlocked(sender.id, recipient.id)) return;
      emitTypingEvent('typing:start', { senderId: sender.id, recipientId: recipient.id, dialogId: makeDialogId(sender.id, recipient.id), userName: sender.name });
    } catch (error) {
      console.error('typing:start error', error);
    }
  });

  socket.on('typing:stop', async (payload = {}) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser?.id) return;
      const sender = await getUserById(activeUser.id);
      if (!sender) return;
      const groupId = String(payload.groupId || '').trim();
      const recipientId = String(payload.recipientId || '').trim();
      if (groupId) {
        const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [groupId, sender.id]);
        if (!membership.rowCount) return;
        emitTypingEvent('typing:stop', { senderId: sender.id, groupId, dialogId: `group:${groupId}`, userName: sender.name });
        return;
      }
      if (!recipientId) return;
      const recipient = await getUserById(recipientId);
      if (!recipient) return;
      emitTypingEvent('typing:stop', { senderId: sender.id, recipientId: recipient.id, dialogId: makeDialogId(sender.id, recipient.id), userName: sender.name });
    } catch (error) {
      console.error('typing:stop error', error);
    }
  });



  socket.on('call:offer', async (payload = {}) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser?.id) return;
      const sender = await getUserById(activeUser.id);
      const recipientId = String(payload.toUserId || '').trim();
      if (!sender || !recipientId) return;
      const recipient = await getUserById(recipientId);
      if (!recipient) return;
      if (await areUsersBlocked(sender.id, recipient.id)) return;
      io.to(`user:${recipient.id}`).emit('call:offer', { fromUserId: String(sender.id), callerName: sender.name, callerPhoto: sender.photo || '', offer: payload.offer || null });
    } catch (error) {
      console.error('call:offer error', error);
    }
  });

  socket.on('call:answer', async (payload = {}) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser?.id) return;
      const sender = await getUserById(activeUser.id);
      const recipientId = String(payload.toUserId || '').trim();
      if (!sender || !recipientId) return;
      io.to(`user:${recipientId}`).emit('call:answer', { fromUserId: String(sender.id), answer: payload.answer || null });
    } catch (error) {
      console.error('call:answer error', error);
    }
  });

  socket.on('call:ice-candidate', async (payload = {}) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser?.id) return;
      const recipientId = String(payload.toUserId || '').trim();
      if (!recipientId || !payload.candidate) return;
      io.to(`user:${recipientId}`).emit('call:ice-candidate', { fromUserId: String(activeUser.id), candidate: payload.candidate });
    } catch (error) {
      console.error('call:ice-candidate error', error);
    }
  });

  socket.on('call:reject', async (payload = {}) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser?.id) return;
      const recipientId = String(payload.toUserId || '').trim();
      if (!recipientId) return;
      io.to(`user:${recipientId}`).emit('call:reject', { fromUserId: String(activeUser.id), reason: String(payload.reason || 'declined') });
    } catch (error) {
      console.error('call:reject error', error);
    }
  });

  socket.on('call:end', async (payload = {}) => {
    try {
      const activeUser = socket.data.user;
      if (!activeUser?.id) return;
      const recipientId = String(payload.toUserId || '').trim();
      if (!recipientId) return;
      io.to(`user:${recipientId}`).emit('call:end', { fromUserId: String(activeUser.id), reason: String(payload.reason || 'ended') });
    } catch (error) {
      console.error('call:end error', error);
    }
  });

  socket.on('disconnect', () => {
    const activeUser = socket.data.user;
    if (!activeUser?.id) return;

    const count = onlineUsers.get(activeUser.id) || 0;
    if (count <= 1) {
      onlineUsers.delete(activeUser.id);
      const lastSeenAt = new Date().toISOString();
      query('UPDATE users SET last_seen_at = $2 WHERE id = $1', [String(activeUser.id), lastSeenAt]).catch(() => null);
      emitPresence(activeUser.id, false, lastSeenAt);
    } else {
      onlineUsers.set(activeUser.id, count - 1);
    }
  });
});

app.get('/api/dialogs/bootstrap', async (req, res) => {
  try {
    const currentUserId = String(req.query.currentUserId || '');
    const search = String(req.query.search || '');
    const currentUser = await getUserById(currentUserId);
    if (!currentUser) return res.json({ users: [], groups: [], onlineUserIds: [], lastSeenMap: {}, generatedAt: new Date().toISOString() });

    const cached = getDialogsBootstrapCache(currentUserId, search);
    if (cached) return res.json({ ...cached, cacheSource: 'memory' });

    const payload = await buildDialogsBootstrapPayload(currentUserId, search);
    setDialogsBootstrapCache(currentUserId, search, payload);
    res.json({ ...payload, cacheSource: 'database' });
  } catch (error) {
    console.error('dialogs bootstrap error', error);
    res.status(500).json({ error: 'Не удалось быстро загрузить диалоги' });
  }
});

app.get('/api/presence', async (_req, res) => {
  const presence = await fetchPresencePayload();
  res.json(presence);
});

app.use((error, req, res, next) => {
  if (!error) return next();
  console.error('server middleware error', error);
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой. Максимум 100 МБ' });
    }
    return res.status(400).json({ error: 'Ошибка загрузки файла' });
  }
  return res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
});

(async () => {
  try {
    await initDatabase();
    scheduleStorageCleanup();
    server.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('startup error', error);
    process.exit(1);
  }
})();
