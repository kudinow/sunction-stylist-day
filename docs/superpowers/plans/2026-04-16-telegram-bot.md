# Telegram Bot — запись на День стилиста: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить Telegram-бота как дополнительный канал записи — пользователь жмёт кнопку на лендинге, идёт в бот, проходит диалог имя → телефон → подтверждение, запись попадает в ту же Google Sheets.

**Architecture:** Google Apps Script принимает Telegram webhook через `doPost`, ведёт диалог через state machine в `PropertiesService`, пишет результат в существующую Google Sheets. Лендинг получает вторую кнопку «Записаться через Telegram» ниже формы.

**Tech Stack:** Google Apps Script (JavaScript), Telegram Bot API, Google Sheets API (через SpreadsheetApp), статический HTML.

---

## Файлы

| Файл | Действие | Что делает |
|------|----------|-----------|
| `gas/telegram-bot.js` | Создать | Исходник GAS-скрипта (версия в репо для истории) |
| `index.html` | Изменить | CSS + HTML для кнопки «Записаться через Telegram» |

---

## Task 1: Создать GAS-скрипт в репозитории

**Files:**
- Create: `gas/telegram-bot.js`

- [ ] **Step 1: Создать файл**

Создать `gas/telegram-bot.js` со следующим содержимым:

```javascript
// ============================================================
// Telegram Bot — День стилиста sunction.store
// Деплоится как Google Apps Script Web App
// Настройки хранятся в Script Properties (не в коде):
//   BOT_TOKEN       — токен бота от BotFather
//   WEBHOOK_SECRET  — любая случайная строка, например: sunction2026
//   SHEET_ID        — ID Google Sheets (из URL таблицы)
//   WEB_APP_URL     — URL задеплоенного Web App (заполняется после деплоя)
// ============================================================

function doPost(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  var token  = e.parameter.token;

  if (token !== secret) {
    return ContentService.createTextOutput('Unauthorized');
  }

  var update = JSON.parse(e.postData.contents);
  handleUpdate(update);
  return ContentService.createTextOutput('OK');
}

// ---------- роутинг ----------

function handleUpdate(update) {
  if (update.callback_query) {
    handleCallback(update.callback_query);
    return;
  }

  if (!update.message) return;

  var msg    = update.message;
  var chatId = String(msg.chat.id);
  var text   = msg.text || '';
  var state  = getState(chatId);

  if (text === '/start') {
    setState(chatId, { step: 'awaiting_name' });
    sendMessage(chatId, 'Привет! Записываю вас на День стилиста 19 апреля.\nКак вас зовут?');
    return;
  }

  if (state.step === 'awaiting_name') {
    setState(chatId, { step: 'awaiting_phone', name: text });
    sendMessage(chatId, 'Отлично, ' + text + '! Укажите номер телефона:');
    return;
  }

  if (state.step === 'awaiting_phone') {
    var confirmText = 'Проверьте данные:\nИмя: ' + state.name + '\nТелефон: ' + text + '\nВсё верно?';
    setState(chatId, { step: 'awaiting_confirm', name: state.name, phone: text });
    sendMessage(chatId, confirmText, {
      inline_keyboard: [[
        { text: '✅ Да',              callback_data: 'confirm_yes' },
        { text: '🔄 Начать заново', callback_data: 'confirm_no'  }
      ]]
    });
    return;
  }

  // idle или unknown
  sendMessage(chatId, 'Напишите /start чтобы записаться.');
}

function handleCallback(callbackQuery) {
  var chatId = String(callbackQuery.message.chat.id);
  var data   = callbackQuery.data;
  var state  = getState(chatId);

  answerCallbackQuery(callbackQuery.id);

  if (data === 'confirm_yes' && state.step === 'awaiting_confirm') {
    writeToSheet(state.name, state.phone);
    setState(chatId, { step: 'idle' });
    sendMessage(chatId, 'Вы записаны! Ждём вас в субботу, 19 апреля 🎉\nАдрес: Земляной Вал, 7');
    return;
  }

  if (data === 'confirm_no') {
    setState(chatId, { step: 'awaiting_name' });
    sendMessage(chatId, 'Хорошо, начнём сначала. Как вас зовут?');
    return;
  }
}

// ---------- состояние ----------

function getState(chatId) {
  var raw = PropertiesService.getScriptProperties().getProperty('state_' + chatId);
  if (!raw) return { step: 'idle' };
  try { return JSON.parse(raw); } catch (err) { return { step: 'idle' }; }
}

function setState(chatId, state) {
  PropertiesService.getScriptProperties().setProperty('state_' + chatId, JSON.stringify(state));
}

// ---------- Telegram API ----------

function sendMessage(chatId, text, replyMarkup) {
  var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  var payload = { chat_id: chatId, text: text };
  if (replyMarkup) {
    payload.reply_markup = JSON.stringify(replyMarkup);
  }
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method:      'post',
    contentType: 'application/json',
    payload:     JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function answerCallbackQuery(callbackQueryId) {
  var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
    method:      'post',
    contentType: 'application/json',
    payload:     JSON.stringify({ callback_query_id: callbackQueryId }),
    muteHttpExceptions: true
  });
}

// ---------- Google Sheets ----------

function writeToSheet(name, phone) {
  var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  var sheet   = SpreadsheetApp.openById(sheetId).getSheets()[0];
  sheet.appendRow([new Date(), name, phone, 'telegram']);
}

// ---------- одноразовая настройка ----------

// Запустить вручную из редактора GAS после выставления WEB_APP_URL в Script Properties
function registerWebhook() {
  var token   = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  var secret  = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  var webApp  = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL');
  var url     = 'https://api.telegram.org/bot' + token + '/setWebhook?url=' + webApp + '?token=' + secret;
  var resp    = UrlFetchApp.fetch(url);
  Logger.log(resp.getContentText()); // должно быть {"ok":true,...}
}
```

- [ ] **Step 2: Закоммитить**

```bash
git add gas/telegram-bot.js
git commit -m "feat: add Telegram bot GAS source"
```

---

## Task 2: Создать и настроить GAS-проект (ручные шаги)

> Этот таск выполняется вручную в браузере. Claude не имеет доступа к Google Apps Script UI.

**Files:** нет (действия в браузере)

- [ ] **Step 1: Создать новый GAS-проект**

Открыть [script.google.com](https://script.google.com) → **New project**.
Переименовать проект: `sunction-telegram-bot`.

- [ ] **Step 2: Вставить код**

Удалить весь код в редакторе, вставить содержимое `gas/telegram-bot.js` (весь файл целиком). Нажать **Save** (Ctrl+S).

- [ ] **Step 3: Узнать ID Google Sheets**

Открыть таблицу, куда приходят заявки с формы. ID — часть URL между `/d/` и `/edit`:
```
https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
```
Скопировать `SHEET_ID_HERE`.

- [ ] **Step 4: Заполнить Script Properties**

В GAS: **Project Settings** (шестерёнка) → **Script Properties** → **Add script property**.
Добавить четыре свойства:

| Property | Value |
|----------|-------|
| `BOT_TOKEN` | новый токен от BotFather (после `/revoke`) |
| `WEBHOOK_SECRET` | `sunction2026` (или любая другая строка) |
| `SHEET_ID` | ID таблицы из шага 3 |
| `WEB_APP_URL` | оставить пустым пока |

Нажать **Save script properties**.

- [ ] **Step 5: Задеплоить как Web App**

**Deploy** → **New deployment** → тип **Web app**.
- Execute as: **Me**
- Who has access: **Anyone**

Нажать **Deploy** → скопировать **Web app URL** (выглядит как `https://script.google.com/macros/s/.../exec`).

- [ ] **Step 6: Записать WEB_APP_URL в Script Properties**

Вернуться в **Script Properties**, обновить `WEB_APP_URL` — вставить URL из шага 5.
Нажать **Save script properties**.

- [ ] **Step 7: Выдать права скрипту на Sheets**

В редакторе GAS выбрать функцию `writeToSheet` из выпадающего списка, нажать **Run**.
GAS попросит разрешения → **Review permissions** → выбрать свой Google-аккаунт → **Allow**.

---

## Task 3: Зарегистрировать webhook

**Files:** нет (действия в GAS)

- [ ] **Step 1: Запустить registerWebhook**

В редакторе GAS выбрать функцию `registerWebhook` из выпадающего списка → **Run**.

- [ ] **Step 2: Проверить лог**

Открыть **Execution log** (появится внизу). Должно быть:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

Если `ok: false` — проверить `BOT_TOKEN` и `WEB_APP_URL` в Script Properties.

---

## Task 4: Добавить кнопку «Записаться через Telegram» на лендинг

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Добавить CSS**

Найти в `index.html` блок `.form-submit:disabled` (около строки 609) и вставить после него:

```css
    .tg-alt {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      margin-top: 16px;
      padding: 14px 16px;
      background: transparent;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      font-family: 'Nunito Sans', sans-serif;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: border-color 0.2s, background 0.2s;
      cursor: pointer;
    }

    .tg-alt:hover {
      border-color: #aaa;
      background: var(--bg);
    }

    .tg-alt svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      fill: #27A7E5;
    }

    .tg-alt-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 20px;
      color: var(--text-muted);
      font-size: 12px;
    }

    .tg-alt-divider::before,
    .tg-alt-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-light);
    }
```

- [ ] **Step 2: Добавить HTML-кнопку**

Найти строку (около 1246):
```html
          <p class="form-note">Бесплатно и&nbsp;без обязательств покупки. Если планы изменятся — просто сообщите нам.</p>
        </form>
```

Вставить после `</form>` (перед `<div class="success"`):

```html
        <div class="tg-alt-divider">или</div>
        <a
          href="https://t.me/ВАШЕ_ИМЯ_БОТА"
          target="_blank"
          rel="noopener"
          class="tg-alt"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
          </svg>
          Записаться через Telegram
        </a>
```

> Заменить `ВАШЕ_ИМЯ_БОТА` на username бота (без @), например `sunction_bot`.

- [ ] **Step 3: Проверить локально**

```bash
python3 -m http.server 8080
```

Открыть `http://localhost:8080/` → найти секцию «Запишитесь на консультацию» → убедиться что кнопка «Записаться через Telegram» отображается под формой, не конкурирует визуально с «Забронировать место».

- [ ] **Step 4: Закоммитить**

```bash
git add index.html
git commit -m "feat: add Telegram bot signup button to landing"
```

---

## Task 5: Сквозное тестирование

**Files:** нет

- [ ] **Step 1: Открыть бота**

Перейти в `t.me/<username_бота>` → нажать **Start** / написать `/start`.

Ожидаемый ответ:
```
Привет! Записываю вас на День стилиста 19 апреля.
Как вас зовут?
```

- [ ] **Step 2: Пройти весь сценарий**

Ввести имя → ввести телефон → нажать ✅ Да.

Ожидаемый финальный ответ:
```
Вы записаны! Ждём вас в субботу, 19 апреля 🎉
Адрес: Земляной Вал, 7
```

- [ ] **Step 3: Проверить Google Sheets**

Открыть таблицу → убедиться что появилась новая строка с именем, телефоном и значением `telegram` в колонке Источник.

- [ ] **Step 4: Проверить сценарий «Начать заново»**

Написать `/start` ещё раз → ввести имя → ввести телефон → нажать 🔄 Начать заново → убедиться что бот снова спрашивает имя, в таблицу ничего не записалось.

- [ ] **Step 5: Проверить idle-сообщение**

Написать боту произвольный текст (не `/start`) в состоянии idle.

Ожидаемый ответ:
```
Напишите /start чтобы записаться.
```

- [ ] **Step 6: Задеплоить лендинг**

```bash
git push origin main
```

Через 30–60 секунд убедиться что кнопка «Записаться через Telegram» видна на живом сайте.
