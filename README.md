# Realtime Messenger

Готовая версия мессенджера для **GitHub + Railway**.

## Что уже подготовлено

- проект очищен от локальных пользовательских данных
- добавлен `.gitignore`
- добавлен `.env.example`
- сервер готов к деплою на Railway
- добавлена поддержка `CORS_ORIGIN` для отдельного фронтенда
- фронтенд умеет работать как с тем же доменом, так и с отдельным Railway backend

## Локальный запуск

```bash
npm install
npm start
```

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

1. Создай новый проект из GitHub-репозитория.
2. В Variables добавь при необходимости:
   - `PORT=3000`
   - `CORS_ORIGIN=*`
3. Railway сам установит зависимости и запустит `npm start`.

### Для варианта фронт + бэкенд отдельно

Если фронтенд будет на Vercel, а бэкенд на Railway:

- на Railway укажи `CORS_ORIGIN=https://your-frontend.vercel.app`
- в `public/config.js` пропиши URL Railway backend

Пример:

```js
window.APP_CONFIG = {
  API_BASE_URL: 'https://your-backend.up.railway.app',
  SOCKET_URL: 'https://your-backend.up.railway.app'
};
```

## Vercel

В этом репозитории есть `vercel.json` для раздачи статического фронтенда из папки `public`.

Для Vercel нужно: 

1. Задеплоить backend на Railway.
2. Перед деплоем фронтенда заменить содержимое `public/config.js` на URL Railway backend.
3. Задеплоить этот же репозиторий на Vercel как статический frontend.

> Важно: Socket.IO сервер должен работать на Railway, а не на Vercel.

## Структура данных

Во время работы сервер сам создаёт:

- `data/users.json`
- `data/messages.json`
- `public/uploads/*`

Эти файлы исключены из Git.
