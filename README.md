# sunction-stylist-day

Одностраничный лендинг для офлайн-события «День стилиста» магазина sunction.store.

Событие: **19 апреля, суббота, 12:00–16:00**, Москва, ул. Земляной Вал, д. 7.

## Что внутри

- `index.html` — сам лендинг (статический HTML с inline CSS/JS, без сборки)
- `0c3dec31_img_2K.jpg` — hero-фото
- `stylist-valentina.jpeg` — фото стилиста (Валентина Шашкова)
- `sunction-logo-transparent.png` — логотип магазина
- `Logo/` — 14 PNG логотипов брендов для бегущей строки

## Локальный просмотр

```sh
python3 -m http.server 8080
# → http://localhost:8080/
```

## Деплой на GitHub Pages (корневой домен репо)

1. Settings → Pages → Source: **Deploy from a branch** → Branch: **main** / folder: **/ (root)** → Save
2. Через 30–60 секунд лендинг будет доступен на `https://<owner>.github.io/sunction-stylist-day/`

## Привязка к поддомену (например, `stylist.sunction.store`)

1. В DNS-панели sunction.store добавить CNAME-запись:
   - **Host / Name:** `stylist`
   - **Target / Value:** `<owner>.github.io`
2. В корень репозитория добавить файл `CNAME` с единственной строкой: `stylist.sunction.store`
3. Settings → Pages → Custom domain → `stylist.sunction.store` → Save
4. Дождаться, пока GitHub выпустит HTTPS-сертификат (несколько минут), включить **Enforce HTTPS**

## Форма заявок

HTML шлёт заявки на Google Apps Script endpoint (зашит в коде):

```
https://script.google.com/macros/s/AKfycbxSnfOJMrQrJVJPmAb2WPRIRZ-_FmfWAvCcrITDOB1aoEyAFv426FI8yPvS2PtZJ7rj/exec
```

Заявки складываются в Google Sheets + уведомления на email. Изменение получателей — в самом Apps Script.

## Как править тексты

Все тексты — прямо в `index.html`. Править в любом редакторе, коммитить, пушить в `main`. Pages пересобирается автоматически.
