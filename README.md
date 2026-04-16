# Full Messenger Fixed

Готовый проект мессенджера для Windows с desktop-клиентом, React-фронтендом и локальным backend.

## Что внутри
- `apps/server` — Express + Socket.IO + JSON storage
- `apps/client` — React + Vite
- `apps/desktop` — Electron

## Почему без SQLite
В этой версии хранение сделано через JSON-файл, чтобы проект запускался на Windows без `better-sqlite3`, `node-gyp` и Visual Studio C++ Build Tools.

## Запуск
Открой PowerShell в корне проекта и выполни:

```powershell
npm install
npm run dev
```

После запуска:
- backend: `http://localhost:3001`
- frontend: `http://localhost:5173`
- Electron откроется автоматически

## Функции
- регистрация без email
- вход по телефону или username + пароль
- профиль и редактирование аккаунта
- настройки
- создание чатов и групп
- закрепление чатов
- realtime-сообщения через Socket.IO
- индикатор набора текста

## Важное
Данные хранятся в:
`apps/server/data/db.json`

Можно удалить этот файл, чтобы сбросить данные.
