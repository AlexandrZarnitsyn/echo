# Realtime Messenger

Готовая версия мессенджера с **Node.js + Express + Socket.IO + PostgreSQL**.

## Что внутри

- backend на `Express`
- realtime-чат через `Socket.IO`
- база данных `PostgreSQL`
- готово для `GitHub + Railway`
- фронтенд можно держать на Railway вместе с backend или отдельно на Vercel

## Что нужно для запуска

1. Создать базу PostgreSQL
2. Заполнить `.env`
3. Установить зависимости и запустить сервер

## Переменные окружения

Скопируй `.env.example` в `.env` и заполни:

```env
PORT=3000
CORS_ORIGIN=*
DATABASE_URL=postgresql://postgres:password@localhost:5432/realtime_messenger
PGSSL=disable
```

- `DATABASE_URL` — строка подключения к PostgreSQL
- `CORS_ORIGIN` — домен фронтенда, если фронт и backend разделены
- `PGSSL=disable` — удобно для локального Postgres; на Railway обычно SSL оставляют включенным

## Локальный запуск

```bash
npm install
npm start
```

Сервер сам создаст нужные таблицы при первом запуске.

Открой `http://localhost:3000`.

## GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

## Railway

### Вариант 1. Всё приложение на Railway

1. Создай новый проект из GitHub-репозитория.
2. Добавь сервис `PostgreSQL`.
3. В Variables у Node-сервиса должны быть:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}` или выданный Railway URL базы
   - `CORS_ORIGIN=*`
4. Railway установит зависимости и запустит `npm start`.

### Вариант 2. Фронтенд на Vercel, backend на Railway

На Railway:
- backend и PostgreSQL держишь вместе
- `CORS_ORIGIN=https://your-frontend.vercel.app`

В `public/config.js` укажи Railway backend:

```js
window.APP_CONFIG = {
  API_BASE_URL: 'https://your-backend.up.railway.app',
  SOCKET_URL: 'https://your-backend.up.railway.app'
};
```

## Vercel

В репозитории есть `vercel.json` для раздачи статического фронтенда из `public`.

Важно: `Socket.IO` и API должны работать на Railway, а не на Vercel.

## Структура

- `server.js` — backend + API + Socket.IO
- `public/` — фронтенд
- `db/init.sql` — схема PostgreSQL

## Важно

Сейчас пароли сохраняются как обычный текст, чтобы не ломать уже готовую простую логику проекта. Для нормального продакшена лучше следующим шагом заменить это на `bcrypt` и токены/сессии.


## Production domains

- Frontend (Vercel): https://echo-xi-ashy.vercel.app
- Backend (Railway): https://echo-messenger.up.railway.app

### Railway Variables

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
CORS_ORIGIN=https://echo-xi-ashy.vercel.app
```
