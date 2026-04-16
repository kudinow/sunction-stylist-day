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

  try {
    var update = JSON.parse(e.postData.contents);
    handleUpdate(update);
  } catch (err) {
    Logger.log('Error: ' + err);
  }
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
    if (!text) {
      sendMessage(chatId, 'Пожалуйста, напишите ваше имя текстом.');
      return;
    }
    setState(chatId, { step: 'awaiting_phone', name: text });
    sendMessage(chatId, 'Отлично, ' + text + '! Укажите номер телефона:');
    return;
  }

  if (state.step === 'awaiting_phone') {
    if (!text) {
      sendMessage(chatId, 'Пожалуйста, напишите номер телефона текстом.');
      return;
    }
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
  var url     = 'https://api.telegram.org/bot' + token +
                '/setWebhook?url=' + encodeURIComponent(webApp + '?token=' + secret);
  var resp    = UrlFetchApp.fetch(url);
  Logger.log(resp.getContentText()); // должно быть {"ok":true,...}
}
