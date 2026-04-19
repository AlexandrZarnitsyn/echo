Добавь эти файлы в папку backend вашего репозитория.

Что дальше в Railway:
1. Root Directory = /backend
2. Builder = Dockerfile
3. Variables:
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   CORS_ORIGIN=*
   FRONTEND_ORIGIN=*
4. Redeploy
