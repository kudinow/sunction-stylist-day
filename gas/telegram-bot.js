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
  if (!e || !e.parameter || !e.postData) {
    return ContentService.createTextOutput('OK');
  }

  var secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  var token  = e.parameter.token;

  if (token !== secret) {
    return ContentService.createTextOutput('OK');
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    debugLog('LOCK timeout');
    return ContentService.createTextOutput('OK');
  }

  try {
    var update   = JSON.parse(e.postData.contents);
    var updateId = String(update.update_id);

    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('done_' + updateId)) {
      debugLog('SKIP duplicate update_id=' + updateId);
      return ContentService.createTextOutput('OK');
    }

    debugLog('IN  update_id=' + updateId);
    handleUpdate(update);
    props.setProperty('done_' + updateId, '1');
    debugLog('OUT update_id=' + updateId);
  } catch (err) {
    debugLog('ERR ' + (err && err.stack ? err.stack : err));
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('OK');
}

// ---------- роутинг ----------

function handleUpdate(update) {
  if (update.callback_query) {
    handleCallback(update.callback_query);
    return;
  }

  if (!update.message) {
    debugLog('  no message in update');
    return;
  }

  var msg    = update.message;
  var chatId = String(msg.chat.id);
  var text   = msg.text || '';
  var state  = getState(chatId);

  debugLog('  handleUpdate chatId=' + chatId + ' step=' + state.step + ' text="' + text + '"');

  if (text === '/start') {
    setState(chatId, { step: 'awaiting_name' });
    sendMessage(chatId, 'Привет! Записываю вас на День стилиста 19 апреля.\nКак вас зовут?');
    return;
  }

  if (state.step === 'awaiting_name') {
    if (!text) {
      sendMessage(chatId, 'Пожалуйста, напишите ваше имя текстом.');
      return;
    }
    setState(chatId, { step: 'awaiting_phone', name: text });
    sendMessage(chatId,
      'Отлично, ' + text + '! Поделитесь своим номером телефона, мы перезвоним, чтобы подобрать удобный слот. Спам отправлять не будем.',
      {
        keyboard: [[{ text: 'Поделиться', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    );
    return;
  }

  if (state.step === 'awaiting_phone') {
    var phone = (msg.contact && msg.contact.phone_number) || text;
    if (!phone) {
      sendMessage(chatId, 'Пожалуйста, отправьте номер — кнопкой «Поделиться» или текстом.');
      return;
    }
    var confirmText = 'Проверьте данные:\nИмя: ' + state.name + '\nТелефон: ' + phone + '\nВсё верно?';
    setState(chatId, { step: 'awaiting_confirm', name: state.name, phone: phone });
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

  debugLog('  handleCallback chatId=' + chatId + ' step=' + state.step + ' data=' + data);

  answerCallbackQuery(callbackQuery.id);

  if (data === 'confirm_yes' && state.step === 'awaiting_confirm') {
    writeToSheet(state.name, state.phone);
    setState(chatId, { step: 'idle' });
    sendMessage(chatId, 'Вы записаны! Ждём вас в субботу, 19 апреля 🎉\nАдрес: Земляной Вал, 7', {
      remove_keyboard: true
    });
    return;
  }

  if (data === 'confirm_no') {
    setState(chatId, { step: 'awaiting_name' });
    sendMessage(chatId, 'Хорошо, начнём сначала. Как вас зовут?', {
      remove_keyboard: true
    });
    return;
  }

  sendMessage(chatId, 'Что-то пошло не так. Напишите /start чтобы начать заново.');
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
  var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method:      'post',
    contentType: 'application/json',
    payload:     JSON.stringify(payload),
    muteHttpExceptions: true
  });
  debugLog('    sendMessage code=' + resp.getResponseCode() + ' body=' + resp.getContentText());
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

// ---------- диагностика ----------

function debugLog(msg) {
  try {
    var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('debug');
    if (!sheet) {
      sheet = ss.insertSheet('debug');
      sheet.appendRow(['time', 'message']);
    }
    sheet.appendRow([new Date(), msg]);
  } catch (err) {
    // не падаем, если не можем залогировать
  }
}

function clearDebugLog() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName('debug');
  if (sheet) {
    sheet.clear();
    sheet.appendRow(['time', 'message']);
  }
}

// Очистить всё состояние и done-метки (для теста с чистого листа)
function resetAll() {
  var props = PropertiesService.getScriptProperties();
  var all   = props.getProperties();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('state_') === 0 || k.indexOf('done_') === 0) {
      props.deleteProperty(k);
    }
  });
}

// ---------- одноразовая настройка ----------

// Запустить вручную из редактора GAS после выставления WEB_APP_URL в Script Properties
function registerWebhook() {
  var token   = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  var secret  = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  var webApp  = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL');
  var url     = 'https://api.telegram.org/bot' + token +
                '/setWebhook?url=' + encodeURIComponent(webApp + '?token=' + secret) +
                '&drop_pending_updates=true' +
                '&max_connections=1';
  var resp    = UrlFetchApp.fetch(url);
  Logger.log(resp.getContentText()); // должно быть {"ok":true,...}
}

// Регистрирует вебхук на Cloudflare Worker-прокси.
// Требует в Script Properties: BOT_TOKEN, WEBHOOK_SECRET, PROXY_URL.
function registerWebhookViaProxy() {
  var props  = PropertiesService.getScriptProperties();
  var token  = props.getProperty('BOT_TOKEN');
  var secret = props.getProperty('WEBHOOK_SECRET');
  var proxy  = props.getProperty('PROXY_URL');
  if (!proxy) {
    Logger.log('Set PROXY_URL in Script Properties first');
    return;
  }
  var url = 'https://api.telegram.org/bot' + token +
            '/setWebhook?url=' + encodeURIComponent(proxy) +
            '&secret_token=' + encodeURIComponent(secret) +
            '&drop_pending_updates=true' +
            '&max_connections=10';
  var resp = UrlFetchApp.fetch(url);
  Logger.log(resp.getContentText());
}
