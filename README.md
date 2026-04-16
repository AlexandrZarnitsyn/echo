# Realtime Messenger

Готовая структура для раздельного деплоя:

- `backend/` — сервер для Railway
- корень репозитория — статический фронтенд для Vercel

## Railway

- Root Directory: `/backend`
- Variables:
  - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
  - `NODE_ENV=production`
  - `CORS_ORIGIN=https://echo-xi-ashy.vercel.app`

## Vercel

- Root Directory: `/`
- Framework Preset: Other / Static
- Никакие env не нужны

## Домены уже прописаны

- frontend: `https://echo-xi-ashy.vercel.app`
- backend: `https://echo-messenger.up.railway.app`

Если меняешь домены, обнови:

- `config.js`
- `vercel.json`
- `backend/public/config.js`
