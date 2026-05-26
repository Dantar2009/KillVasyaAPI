# 💀 Убей Васю — Бэкенд

Бэкенд для онлайн-игры "Убей Васю". Node.js + Express + Socket.IO + PostgreSQL.

**🌐 Играть:** [kill-vasya.vercel.app](https://kill-vasya.vercel.app)
**🌐 Фронтенд:** [kill-vasya.vercel.app](https://kill-vasya.vercel.app)

## 🎮 Как работает игра (серверная логика)

1. **Connection** — игрок подключается через WebSocket с `name` и `pass`
2. Сервер проверяет пользователя в PostgreSQL
3. **createRoom** — создаёт комнату, игрок выбирает роль (killer/bodyguard)
4. **joinRoom** — второй игрок присоединяется по ID комнаты
5. Когда оба в комнате — генерируется случайная **локация**
6. **sendMessage** — убийца пишет первым, телохранитель вторым
7. Когда оба текста готовы — вызывается **OpenRouter API** (AI-судья)
8. AI возвращает `winner`, `aiOtvet` и `epitaph` (если убийца победил)
9. Рейтинг обновляется в PostgreSQL, эпитафия сохраняется в `cemetery`
10. **leaveRoom** — выход из комнаты, автопобеда сопернику
11. **ready** — оба нажали "Играть снова" → сброс, новая локация

## 📝 API

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/users/register` | Регистрация (bcrypt) |
| POST | `/users/signin` | Вход (bcrypt compare) |

### WebSocket события

| Событие | Отправитель | Описание |
|---------|-------------|----------|
| `createRoom` | Клиент | Создать комнату |
| `joinRoom` | Клиент | Присоединиться |
| `sendMessage` | Клиент | Отправить текст |
| `leaveRoom` | Клиент | Выйти из комнаты |
| `ready` | Клиент | Готовность к переигрыванию |
| `roomsList` | Сервер | Список всех комнат |
| `createRoom` | Сервер | Новая комната создана |
| `updateRoom` | Сервер | Комната обновлена |
| `deleteRoom` | Сервер | Комната удалена |
| `updateRatings` | Сервер | Обновление рейтинга |
| `cemeteryUpdate` | Сервер | Обновление кладбища |
| `openRoom` | Сервер | Редирект в комнату |

## 🚀 Запуск

\`\`\`bash
npm install
npm run dev
\`\`\`

## 🔧 Переменные окружения

\`\`\`
DATABASE_URL=postgresql://...
FRONTEND_URL=http://localhost:5173
PORT=3000
APIKEY1=sk-or-v1
APIKEY2=sk-or-v1
APIKEY3=sk-or-v1
APIKEY4=sk-or-v1
можно бесконечно
\`\`\`

## 🛠️ Стек

Node.js, Express, Socket.IO, PostgreSQL, OpenRouter API, TypeScript, bcrypt