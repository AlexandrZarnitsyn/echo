# Realtime Messenger — ready setup

## Самый простой запуск: только Railway
1. Загрузи этот репозиторий в GitHub.
2. В Railway создай Postgres.
3. Создай сервис из GitHub repo.
4. В сервисе поставь **Root Directory** = `/backend`.
5. Добавь переменные:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://your-frontend-domain.vercel.app`
   - `FRONTEND_ORIGIN=https://your-frontend-domain.vercel.app`
6. Если фронтенд не нужен отдельно, просто открой Railway-домен: backend сам раздаёт UI из `backend/public`.

## Если хочешь фронтенд на Vercel
1. Импортируй этот же репозиторий в Vercel.
2. `Root Directory` оставь `/`.
3. В файле `config.js` укажи домен Railway backend:

```js
window.APP_CONFIG = {
  API_BASE_URL: "https://YOUR-BACKEND.up.railway.app",
  SOCKET_URL: "https://YOUR-BACKEND.up.railway.app"
};
```

## Структура
- `/backend` — Node.js + Express + Socket.IO + PostgreSQL
- `/backend/public` — фронтенд для same-origin запуска с Railway
- `/` — фронтенд для отдельного статического деплоя


## Persistent avatars on Railway

To keep uploaded avatars after redeploys, mount a Railway volume to your backend service and set `UPLOADS_DIR=/data/uploads` (or any mounted path). Without a persistent uploads directory, files inside the container can be lost on redeploy.


## Вторая база данных

Можно подключить вторую PostgreSQL базу через переменную `SECONDARY_DATABASE_URL`.
В этой сборке основная БД остаётся источником правды, а вторая БД используется для хранения бинарных данных медиа, если переменная задана.


## WebRTC / TURN для аудиозвонков

Для сложных сетей и мобильных операторов можно включить TURN на бэкенде через переменные окружения:

```env
TURN_URLS=turn:your-turn-host:3478?transport=udp,turn:your-turn-host:3478?transport=tcp
TURN_USERNAME=your_user
TURN_CREDENTIAL=your_password
```

Альтернатива — передать полный JSON через `WEBRTC_ICE_SERVERS_JSON`. Клиент автоматически загрузит конфиг с `/api/webrtc/config`.
