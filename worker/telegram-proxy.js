// Cloudflare Worker — прокси Telegram → Google Apps Script.
//
// Зачем: GAS Web App иногда отвечает Telegram 302 Moved Temporarily
// на googleusercontent.com, и Telegram не идёт за редиректом на POST.
// Этот Worker принимает вебхук, мгновенно отвечает 200 OK и форвардит
// апдейт в GAS, сам следуя за 3xx с сохранением метода и тела.
//
// Переменные окружения (Worker → Settings → Variables and Secrets):
//   GAS_URL         — URL Web App из GAS (…/exec)
//   WEBHOOK_SECRET  — то же значение, что в GAS Script Properties
//
// Зарегистрируй вебхук через GAS-функцию registerWebhookViaProxy().

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('OK', { status: 200 });
    }

    const headerSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (headerSecret && headerSecret !== env.WEBHOOK_SECRET) {
      return new Response('OK', { status: 200 });
    }

    const body = await request.text();

    let url = env.GAS_URL + '?token=' + encodeURIComponent(env.WEBHOOK_SECRET);
    for (let hop = 0; hop < 5; hop++) {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        redirect: 'manual',
      });
      if (resp.status >= 300 && resp.status < 400) {
        const next = resp.headers.get('Location');
        if (!next) break;
        url = next;
        continue;
      }
      break;
    }

    return new Response('OK', { status: 200 });
  },
};
