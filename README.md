# Green-API WhatsApp Chat

Веб-чат для WhatsApp на React 19 + TypeScript + Vite. Работает поверх облачного HTTP API [Green-API](https://green-api.com/docs/), своего бэкенда нет: браузер напрямую обращается к Green-API.

## Установка и запуск

### Требования

- Node.js 18+ и npm.
- Аккаунт [Green-API](https://green-api.com/) с созданным инстансом: понадобятся `idInstance` и `apiTokenInstance`. Инстанс должен быть авторизован в WhatsApp (QR-код в личном кабинете).

### Шаги

```bash
npm install
npm run dev
```

Откройте адрес, который выведет Vite (обычно `http://localhost:5173`; если порт занят, Vite возьмёт следующий свободный, например `5174`).

1. Введите `idInstance` и `apiTokenInstance` и нажмите **Подключиться**. Поле `apiUrl` по умолчанию заполнено значением `API_URL` из `src/config.ts`; его можно изменить.
2. Введите номер получателя с кодом страны и нажмите **Добавить чат**. Форма доступна и после подключения, так что новые чаты можно добавлять в любой момент.
3. Пишите сообщения. Входящие появляются автоматически.

Данные подключения сохраняются в `localStorage` и подставляются в форму после перезагрузки, но автоматически чат не подключается: нужно снова нажать **Подключиться**.

### Команды

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Локальный сервер разработки Vite |
| `npm run build` | Проверка TypeScript и production-сборка в `dist/` |
| `npm run preview` | Локальный просмотр production-сборки |
| `npm run lint` | Проверка кода с помощью ESLint |

> На бесплатном тарифе Green-API писать и получать сообщения можно только с ограниченного списка номеров (иначе HTTP 466). Подробности в разделе [Ограничения](#11-ограничения-и-известные-особенности).

## Краткое описание

- Подключение по `idInstance` и `apiTokenInstance`, настройки инстанса для приёма входящих включаются автоматически.
- Несколько чатов: список в сайдбаре, история хранится в `localStorage` (до 200 сообщений на чат). Чат можно переименовать (✎ в шапке диалога, до 20 символов): имя показывается основным шрифтом, номер мелким.
- Отправка текста со статусами «отправляется / отправлено / не отправлено», повтор неотправленных.
- Приём входящих через `receiveNotification` с подтверждением `deleteNotification`.
- Маска и проверка номера, Enter отправляет, Shift+Enter переносит строку.
- Автопрокрутка, разделители дней, пустые состояния с подсказками.
- Тосты вместо баннеров ошибок, светлая и тёмная темы, мобильный режим «список / диалог».

**Стек:** React 19.2, TypeScript, Vite 8, ESLint, React Compiler.

## Подробное описание

### Содержание

1. [Быстрый обзор](#1-быстрый-обзор)
2. [Структура проекта](#2-структура-проекта)
3. [Архитектура и поток данных](#3-архитектура-и-поток-данных)
4. [Слой API — `api/greenApi.ts`](#4-слой-api--apigreenapits)
5. [Хук приёма — `hooks/useGreenApiPolling.ts`](#5-хук-приёма--hooksusegreenapipollingts)
6. [Контейнер — `App.tsx`](#6-контейнер--apptsx)
7. [Компоненты UI](#7-компоненты-ui)
8. [Типы — `types/chat.ts`](#8-типы--typeschatts)
9. [Утилиты](#9-утилиты)
10. [Сценарии работы пошагово](#10-сценарии-работы-пошагово)
11. [Ограничения и известные особенности](#11-ограничения-и-известные-особенности)

---

### 1. Быстрый обзор

| Что | Как |
| --- | --- |
| Аутентификация | `idInstance` + `apiTokenInstance` из личного кабинета Green-API |
| Отправка | `POST .../sendMessage/{token}` с `{ chatId, message }` |
| Приём | long-polling: `GET .../receiveNotification/{token}?receiveTimeout=5`, затем `DELETE .../deleteNotification/{token}/{receiptId}` |
| Хранение данных | `localStorage`: данные подключения (`green-api-credentials`), история чатов (`green-api-chats`), тема (`green-api-theme`), имена чатов (`green-api-nicknames`) |
| Состояние | `useState` в `App.tsx`, без Redux/Context |

Формат URL любого метода Green-API:

```
{apiUrl}/waInstance{idInstance}/{метод}/{apiTokenInstance}
```

---

### 2. Структура проекта

```
src/
├── main.tsx                      точка входа, монтирует <App />
├── App.tsx                       контейнер: всё состояние и обработчики
├── App.css                       только общий layout (.app-shell, .app-card)
├── api/
│   └── greenApi.ts               HTTP-клиент Green-API
├── hooks/
│   ├── useGreenApiPolling.ts     цикл получения входящих сообщений
│   └── useTheme.ts               светлая/тёмная тема
├── types/
│   └── chat.ts                   все TypeScript-типы
├── utils/
│   ├── phone.ts                  нормализация, маска и проверка номера, chatId
│   └── storage.ts                данные подключения и история чатов в localStorage
└── components/
    ├── Sidebar/                  подключение, переключатель темы, создание чата, список чатов
    ├── ChatPanel/                шапка (кнопка «назад»), список сообщений, поле ввода
    ├── MessageList/              сообщения, разделители дней, статусы, пустые состояния
    ├── Composer/                 поле ввода и кнопка отправки
    └── Toast/                    всплывающие уведомления об ошибках
```

Правило: каждый компонент лежит в своей папке вместе со своим `.css`. Компоненты «глупые»: получают данные и колбэки через props и не обращаются к API сами.

---

### 3. Архитектура и поток данных

```
            ┌──────────────────────── App.tsx ────────────────────────┐
            │ состояние: credentials, apiUrl, idInstanceInput,        │
            │ tokenInput, phone, draft, messages, error,              │
            │ isSending, activeChat                                   │
            └───────┬──────────────────────────────┬──────────────────┘
        props/колбэки│                              │ useGreenApiPolling(...)
          ┌──────────▼───────┐   ┌───────────────┐  │
          │ Sidebar          │   │ ChatPanel     │  ▼
          │  форма, чат      │   │ ├ MessageList │ receiveNotification
          └──────────────────┘   │ └ Composer    │ deleteNotification
                                 └───────┬───────┘
                                         │ onSendMessage
                                         ▼
                            handleSendMessage → checkWhatsapp → sendMessage
```

Поток данных односторонний:

- **Вниз:** `App` передаёт значения и функции-обработчики в компоненты.
- **Вверх:** компоненты вызывают колбэки (`onLogin`, `onSendMessage`, `onDraftChange` …), а `App` меняет состояние.
- **Входящие:** хук опроса вызывает `onIncomingMessage`, `App` добавляет сообщение в `messages`.

---

### 4. Слой API — `api/greenApi.ts`

Чистые функции без React. Все запросы идут через `fetchJson`.

#### `cleanInstanceId(id)`

Обрезает пробелы и префикс `waInstance` (если пользователь вставил его вместе с номером).

#### `resolveApiBaseUrl(credentials)`

Определяет базовый адрес: если поле `apiUrl` заполнено, используется оно (добавляется `https://`, удаляется хвост `/waInstance...`), иначе константа `API_URL` из `src/config.ts` (`https://7201.api.green-api.com`). Общий `api.green-api.com` у этого инстанса отвечал `ERR_TIMED_OUT`, поэтому для другого инстанса укажите его хост в поле или поменяйте константу.

#### `getApiUrl(credentials, method, suffix?)`

Собирает полный URL: `base/waInstance{id}/{method}/{token}[/{suffix}]`. `suffix` нужен для `deleteNotification` (там `receiptId` идёт после токена).

#### `fetchJson<T>(url, init?)`

- при `!response.ok` бросает `Error('HTTP <код> <текст>: <описание>')`;
- описание берётся из `invokeStatus.description` / `correspondentsStatus.description` (так приходит ошибка квоты, HTTP 466), затем из `message`, `error`, `description`, иначе сырой текст;
- пустое тело или `null` → возвращает `null`.

#### Методы

| Функция | HTTP | Метод Green-API | Назначение |
| --- | --- | --- | --- |
| `getStateInstance` | GET | `getStateInstance` | состояние инстанса (`authorized`, `notAuthorized`, `blocked`, `starting`, `suspended`) |
| `getSettings` | GET | `getSettings` | чтение настроек (`incomingWebhook`, `webhookUrl` …) |
| `setSettings` | POST | `setSettings` | запись настроек |
| `checkWhatsapp` | POST | `checkWhatsapp` | есть ли номер в WhatsApp, возвращает правильный `chatId` (может быть `@lid`) |
| `receiveNotification` | GET | `receiveNotification?receiveTimeout=5` | следующее уведомление из очереди или `null` |
| `deleteNotification` | DELETE | `deleteNotification/{token}/{receiptId}` | подтверждение, удаление из очереди |
| `sendMessage` | POST | `sendMessage` | отправка текста: `{ chatId, message }` |

> `forwardMessages` в проекте **не используется**: он пересылает уже существующие сообщения по `idMessage`, а не отправляет новый текст.

---

### 5. Хук приёма — `hooks/useGreenApiPolling.ts`

```ts
useGreenApiPolling({ credentials, onIncomingMessage(chatKey, message), onError, onClearError })
```

Запускает бесконечный цикл опроса, пока заполнены `idInstance` и токен (выбранный чат не нужен). Обрабатываются только уведомления `incomingMessageReceived`; чат определяется по цифрам номера отправителя. При смене данных подключения или размонтировании цикл останавливается (`AbortController` + `clearTimeout`).

#### Алгоритм одной итерации

1. `receiveNotification` — ждёт до 5 секунд новое уведомление.
2. Если пришло `null` — очередь пуста, ничего не делаем.
3. Если `status === 'error'` — показываем `Green-API: <message>`.
4. Иначе извлекаем текст через `extractMessageText`:
   - `messageData.textMessageData.textMessage` — обычный текст;
   - `messageData.extendedTextMessageData.text` — текст со ссылкой/цитатой.
5. Определяем чат: цифры номера из `senderData.sender` (запасной вариант — `chatId`), так `@c.us` и `@lid` не мешают.
6. Если есть текст и тип `incomingMessageReceived` — вызываем `onIncomingMessage(chatKey, message)` (время из `timestamp * 1000`). `App` добавляет сообщение в нужный чат и пропускает дубликаты по `id`.
7. **Всегда** вызываем `deleteNotification`, иначе то же уведомление придёт снова.
8. Следующий запрос планируется через `setTimeout`.

#### Задержки

- успех: 1,5 с;
- ошибка: 5 с.

Опрос последовательный (следующий запрос только после завершения предыдущего), а не `setInterval`, чтобы запросы не накладывались при медленной сети.

#### Колбэки через ref

Колбэки хранятся в `callbacksRef`, обновляются отдельным эффектом. Благодаря этому смена функций между рендерами не перезапускает опрос.

#### Сообщения об ошибках

- `TypeError` от `fetch` → «Сетевая ошибка: нет ответа от Green-API…».
- Текст содержит `custom webhook url is set` → подсказка очистить Webhook URL в кабинете.

---

### 6. Контейнер — `App.tsx`

#### Состояние

| Состояние | Смысл |
| --- | --- |
| `credentials` | **применённые** данные подключения (по ним идут запросы) |
| `apiUrl`, `idInstanceInput`, `tokenInput` | содержимое полей формы (ещё не применено) |
| `phone` | поле ввода номера получателя (в поле показывается с маской) |
| `activeChat` | номер открытого чата (только цифры) |
| `mobileView` | `'list'` или `'chat'`: что показывать на узком экране |
| `chats` | все переписки: `{ [номер]: Message[] }`, синхронизируются с `localStorage` |
| `messages` | производное значение: `chats[activeChat]` |
| `draft` | текст в поле ввода |
| `isSending` | идёт отправка |
| `error` | текст текущего уведомления (показывается в `Toast`) |
| `theme` | `'light'` / `'dark'` из хука `useTheme` |

Производные значения:

- `isConfigured` — заполнены `idInstance` и токен в `credentials`;
- `status` — `offline` → `connected` (подключено, чата нет) → `ready` (чат выбран).

#### Сохранение в localStorage

Эффект записывает `apiUrl`, `idInstance` и токен при каждом изменении полей, а `handleLogin` сохраняет очищенные значения ещё раз при подключении. При старте сохранённые значения подставляются в форму, но подключение не восстанавливается: нужно нажать «Подключиться».

#### `handleLogin`

1. Очищает `idInstance` (`cleanInstanceId`) и токен.
2. Проверяет, что оба заполнены.
3. Записывает `credentials` и сохраняет в `localStorage`.
4. `getSettings`: если `incomingWebhook !== 'yes'` или задан `webhookUrl` — вызывает `setSettings` (`webhookUrl: ''`, `incomingWebhook: 'yes'`, `outgoingAPIMessageWebhook: 'yes'`) и сообщает, что настройки применяются около минуты.
5. `getStateInstance` (один раз за подключение, чтобы не упереться в HTTP 429): сохраняет состояние для индикатора и показывает предупреждение для `notAuthorized`, `blocked`, `starting`, `suspended`.
6. Любая ошибка → тост «Ошибка подключения: …» (для 429 — «подождите около минуты»), `credentials` сбрасываются и форма остаётся открытой, чтобы поправить данные.

#### `handleCreateChat`

Проверяет номер (`isValidRecipient`: не меньше 10 цифр), приводит его к виду `7XXXXXXXXXX` (`normalizeRecipient`: 11-значный номер с `8` в начале меняется на `7`), записывает в `activeChat`, на мобильных переключает на диалог. После этого чат появляется в списке. Опрос входящих от открытого чата не зависит.

#### `handleSendMessage`

1. Валидация: подключено ли, не пустой ли текст, выбран ли чат.
2. Добавляет сообщение в `chats[activeChat]` со статусом `sending` (оптимистичное обновление) и очищает поле ввода.
3. `deliverMessage`: `checkWhatsapp` — если `existsWhatsapp === false`, ошибка; иначе берёт `chatId` из ответа (может быть `...@lid`).
4. `sendMessage` на этот `chatId` (запасной вариант — `номер@c.us`).
5. Успех → статус `sent`. Ошибка → статус `failed`, текст причины (`describeSendError`) сохраняется в `message.error`, сообщение **остаётся** в списке (красный пузырь с кнопками «Повторить» и «Удалить»).

#### `handleRetryMessage` / `handleDeleteMessage`

Повтор снова вызывает `deliverMessage` для того же сообщения (статус `sending`). Удаление убирает сообщение из чата.

#### `handleRenameChat`

Нормализует имя (`normalizeNickname`) и сохраняет его в `nicknames` (`Record<номер, имя>`, ключ `green-api-nicknames`). Пустое имя удаляет ник, и чат снова показывается по номеру. `handleDeleteChat` стирает и ник.

#### `handleSelectChat` / `handleDeleteChat`

Выбор чата делает его активным (и открывает диалог на мобильных). Удаление чата стирает переписку и, если чат был открыт, возвращает к списку.

#### `handleLogout`

Сбрасывает `credentials` и активный чат. Поля формы, история чатов и `localStorage` остаются.

#### Уведомления об ошибках

`error` показывается компонентом `Toast` и очищается сам через 7 секунд. Ошибка опроса повторяется на каждом цикле, поэтому `handlePollingError` запоминает последний текст (`lastPollingErrorRef`) и показывает тост один раз, пока опрос не восстановится.

---

### 7. Компоненты UI

| Компонент | Props (основные) | Отвечает за |
| --- | --- | --- |
| `Sidebar` | поля формы, `isConfigured`, `instanceState`, `theme`, `chats`, `activeChat`, колбэки | форма подключения, карточка подключённого инстанса (индикатор состояния, «Выйти»), переключатель темы, ввод номера с маской, список чатов |
| `ChatPanel` | `activeChat`, `messages`, `draft`, `isSending`, колбэки, `onBack` | шапка чата с кнопкой «назад» (только на мобильных), `MessageList` и `Composer` |
| `MessageList` | `messages`, `isConfigured`, `hasActiveChat`, `onRetry`, `onDelete` | пузыри, разделители дней, значки статуса, автопрокрутка и кнопка «↓ Вниз», пустые состояния с подсказками |
| `Composer` | `draft`, `activeChat`, `isSending`, `onDraftChange`, `onSendMessage` | `textarea`: Enter отправляет, Shift+Enter — новая строка |
| `Toast` | `message`, `onClose`, `duration` | всплывающее уведомление (`role="alert"`) с автозакрытием |

Стили лежат рядом с компонентом и подключаются в самом `.tsx`.

#### Тема

Хук `useTheme` возвращает `[theme, toggleTheme]`, пишет `data-theme` на `<html>` и сохраняет выбор в `localStorage` (`green-api-theme`). Без сохранённого выбора берётся системная (`prefers-color-scheme`). Цвета заданы CSS-переменными в `index.css` (`--chat-bg`, `--bubble-in-bg`, `--toast-bg` и т.д.); тёмные значения переопределены в `:root[data-theme='dark']`.

#### Адаптив

Шире 860px сайдбар и диалог стоят рядом. Уже 860px `.app-card` получает класс `view-list` или `view-chat` (по `mobileView`), и CSS скрывает ненужную панель, как в мессенджерах. Кнопка «←» в шапке диалога возвращает к списку.

#### Доступность

Видимый `:focus-visible` для всех элементов, `role="log"` и `aria-live` у списка сообщений, `role="alert"` у тоста, `aria-label` у иконочных кнопок, `aria-current` у активного чата, подсказка к полю номера через `aria-describedby`, отключение анимаций при `prefers-reduced-motion`.

---

### 8. Типы — `types/chat.ts`

- `Message` — `{ id, text, direction: 'incoming' | 'outgoing', timestamp, status?: 'sending' | 'sent' | 'failed', error?: string }`.
- `ChatSummary` — `{ id, nickname, lastText, lastTimestamp, hasFailed }` для списка чатов.
- `Credentials` — `{ apiUrl, idInstance, apiTokenInstance }`.
- `ConnectionStatus` — `'offline' | 'connected' | 'ready'`.
- `StateInstanceResponse` — ответ `getStateInstance`.
- `NotificationPayload` / `NotificationBody` — ответ `receiveNotification`: `receiptId`, `body.typeWebhook`, `body.timestamp`, `body.idMessage`, `body.senderData`, `body.messageData`.
- `SendMessageResponse` — `{ idMessage }`.
- `InstanceSettings`, `CheckWhatsappResponse` — настройки и ответ проверки номера.

---

### 9. Утилиты

**`utils/nickname.ts`**

- `NICKNAME_MAX_LENGTH` (20), `normalizeNickname(v)` — схлопывает пробелы, обрезает до лимита, `getAvatarText(chatKey, nickname)` — буквы для аватара (первые две буквы имени или последние две цифры номера).

**`utils/phone.ts`**

- `normalizePhone(v)` — удаляет всё, кроме цифр.
- `createChatId(phone)` — `79001234567` → `79001234567@c.us`.
- `formatPhoneDisplay(v)` — цифры, не более 15.
- `normalizeRecipient(v)` — цифры, 11-значный номер с `8` в начале превращается в `7...`.
- `isValidRecipient(v)` — не меньше `MIN_PHONE_DIGITS` (10) цифр.
- `maskPhone(v)` — маска для поля: `+7 999 123-45-67`, для других стран группы по 3 цифры.

**`utils/storage.ts`**

- `readStoredCredentials()` — безопасно читает JSON из `localStorage` (при ошибке возвращает пустые значения).
- `saveStoredCredentials(c)` — пишет, если заполнено хотя бы одно поле, иначе удаляет ключ.
- `readStoredChats()` / `saveStoredChats(chats)` — история чатов (`green-api-chats`), не больше 200 сообщений на чат; прерванные `sending` при чтении превращаются в `failed`.

**`hooks/useTheme.ts`** — тема и её сохранение (см. раздел 7).

---

### 10. Сценарии работы пошагово

#### Первый запуск

1. Пользователь вводит `idInstance` и токен → поля пишутся в `localStorage`.
2. «Подключиться» → `handleLogin` (настройки, состояние инстанса).
3. Вводит номер (маска `+7 999 123-45-67`), «Добавить чат» → `activeChat` задан, чат появляется в списке; опрос работает для всех номеров с момента подключения.

#### Отправка

`Composer` → `onSendMessage` → `handleSendMessage` → (оптимистичный пузырь) → `checkWhatsapp` → `sendMessage` → статус `sent`/`failed`.

#### Приём

Опрос → `receiveNotification` → фильтр по чату → `onIncomingMessage` → `messages` → `MessageList` → `deleteNotification`.

#### Повторный визит

`readStoredCredentials` подставляет данные в поля формы; подключение не восстанавливается, пока не нажата «Подключиться» (`isConfigured = false`).

---

### 11. Ограничения и известные особенности

- **Квота тарифа (HTTP 466).** На бесплатном тарифе Developer можно писать и получать только с трёх номеров, указанных в ответе API. Для остальных `sendMessage` возвращает 466 с текстом `Monthly quota has been exceeded…`. Это ограничение аккаунта, а не ошибка кода.
- **Токен в `localStorage`** лежит открытым текстом.
- **Лимит запросов (HTTP 429).** Green-API ограничивает частоту запросов. Приложение не дублирует `getStateInstance`, а опрос при 429 ждёт 30 секунд.
- **История хранится в `localStorage`** (ключ `green-api-chats`): `chats` — это `Record<номер, Message[]>`, до 200 сообщений на чат. Входящие от любого номера попадают в свой чат (номер берётся из `senderData.sender`). Сообщения со статусом `sending`, не успевшие уйти до перезагрузки, помечаются как неотправленные. Удаление чата в сайдбаре стирает его переписку.
- **Только текст.** Медиа, группы, статусы доставки не поддерживаются.
- **`@lid`.** При `enableLidMode: yes` WhatsApp использует идентификаторы вида `...@lid`. Для отправки `chatId` берётся из `checkWhatsapp`, для приёма сравниваются цифры.
- **Очередь уведомлений общая.** Её читает любой клиент инстанса; прочитанное и удалённое сообщение другим клиентом уже не придёт.
- **Настройки применяются с задержкой** около минуты.
- **Расширения браузера** могут писать ошибки в консоль (например, `PublicKeyCredential is not defined`) — к приложению они не относятся.
- **React Compiler** включён (`babel-plugin-react-compiler`), поэтому ручная мемоизация почти не используется.
