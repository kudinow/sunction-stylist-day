# Popup Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить два конверсионных компонента в `index.html`: exit-intent popup с inline-формой (десктоп) и trust nudge у формы (все устройства).

**Architecture:** Всё реализуется в одном файле `index.html` — CSS в существующий `<style>` блок, HTML-разметка компонентов в body, JS в существующий `<script>` блок. Общая утилита `getCountdown()` и единый ключ `localStorage.sunction_submitted` связывают оба компонента и основную форму.

**Tech Stack:** Vanilla JS, CSS animations, IntersectionObserver API, Yandex.Metrika goals.

---

## File Map

| Файл | Изменение |
|---|---|
| `index.html` | Единственный файл. CSS — перед `</style>`. HTML компонентов — перед `</body>`. JS — внутри существующего `<script>` блока. |

---

### Task 1: Shared JS utility — getCountdown() + state keys

**Files:**
- Modify: `index.html` — внутри `<script>` блока, сразу после строки `function reachGoal(name) {` блока (≈ строка 1118)

- [ ] **Step 1: Найти место вставки**

Открой `index.html`, найди строку:
```javascript
    // --- Metrika helper ---
    function reachGoal(name) {
```
Новый код вставляется **сразу после** закрывающей скобки этой функции (после строки `}`).

- [ ] **Step 2: Вставить утилиту и константы**

Добавь сразу после `reachGoal` функции:
```javascript
    // --- Shared state keys ---
    const KEY_SUBMITTED = 'sunction_submitted';
    const KEY_POPUP_SHOWN = 'sunction_popup_shown';
    const KEY_NUDGE_SHOWN = 'sunction_nudge_shown';

    // --- Countdown to 2026-04-19 12:00 Moscow ---
    function getCountdown() {
      const target = new Date('2026-04-19T12:00:00+03:00');
      const diff = target - new Date();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
      return {
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000)  / 60000)
      };
    }
```

- [ ] **Step 3: Проверить в консоли браузера**

Открой `index.html` в браузере (или перезагрузи), открой DevTools → Console, выполни:
```javascript
getCountdown()
```
Ожидаемый результат — объект вида `{days: 2, hours: 23, minutes: 47}` (числа зависят от текущего времени).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add getCountdown() utility and shared state keys"
```

---

### Task 2: Component B — Trust nudge HTML + CSS

**Files:**
- Modify: `index.html` — CSS перед `</style>`, HTML внутри `.signup__form` перед `<form id="signupForm">`

- [ ] **Step 1: Добавить CSS**

Найди в `index.html` строку `</style>` (конец блока стилей, ≈ строка 883). Вставь **перед** ней:

```css
    /* ===== TRUST NUDGE ===== */
    .trust-nudge {
      display: none;
      align-items: flex-start;
      gap: 10px;
      background: var(--bg-dark);
      color: #fff;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 20px;
      font-size: 13px;
      line-height: 1.55;
      animation: nudgeSlideDown 0.3s ease;
    }

    .trust-nudge.visible {
      display: flex;
    }

    @keyframes nudgeSlideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .trust-nudge__icon {
      flex-shrink: 0;
      margin-top: 1px;
    }

    .trust-nudge__icon svg {
      width: 14px;
      height: 14px;
      stroke: rgba(255,255,255,0.7);
      fill: none;
      stroke-width: 2;
    }

    .trust-nudge__text {
      flex: 1;
    }

    .trust-nudge__close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      line-height: 1;
      font-size: 18px;
      margin-left: 4px;
    }

    .trust-nudge__close:hover { color: #fff; }
    .trust-nudge__close svg {
      width: 14px;
      height: 14px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      display: block;
    }
```

- [ ] **Step 2: Добавить HTML разметку**

Найди строку:
```html
        <div class="signup__form fade-up fade-up-delay-2" id="formCard">
```
Сразу после неё (перед `<form id="signupForm">`) вставь:

```html
        <div class="trust-nudge" id="trustNudge">
          <span class="trust-nudge__icon">
            <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <span class="trust-nudge__text">
            Телефон нужен только для подтверждения времени.
            До мероприятия — <span id="nudgeCountdown">3 дн.</span>, осталось 8 мест.
          </span>
          <button type="button" class="trust-nudge__close" id="trustNudgeClose">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
```

- [ ] **Step 3: Проверить отображение**

Временно добавь `visible` класс в HTML: `<div class="trust-nudge visible" id="trustNudge">`.
Открой страницу — плашка должна быть видна над полями формы: тёмный фон, белый текст, иконка замка слева, крестик справа.
После проверки **удали** `visible` из HTML (логика появления — в Task 3).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add trust nudge HTML and CSS"
```

---

### Task 3: Component B — Trust nudge JS логика

**Files:**
- Modify: `index.html` — добавить в конец `<script>` блока, перед `</script>`

- [ ] **Step 1: Добавить JS**

Найди закрывающий тег `</script>` (самый последний на странице). Вставь **перед** ним:

```javascript
    // ===== TRUST NUDGE =====
    (function () {
      var nudgeTimer = null;

      function updateNudgeCountdown() {
        var el = document.getElementById('nudgeCountdown');
        if (!el) return;
        var cd = getCountdown();
        el.textContent = cd.days > 0 ? cd.days + ' дн.' : cd.hours + ' ч.';
      }

      function showNudge() {
        if (sessionStorage.getItem(KEY_NUDGE_SHOWN)) return;
        if (localStorage.getItem(KEY_SUBMITTED)) return;
        sessionStorage.setItem(KEY_NUDGE_SHOWN, '1');
        updateNudgeCountdown();
        document.getElementById('trustNudge').classList.add('visible');
        reachGoal('trust_nudge_show');
      }

      // Close button
      document.getElementById('trustNudgeClose').addEventListener('click', function () {
        document.getElementById('trustNudge').classList.remove('visible');
      });

      // IntersectionObserver — запустить таймер когда #signup в поле зрения
      var signupSection = document.getElementById('signup');
      var signupObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!nudgeTimer) nudgeTimer = setTimeout(showNudge, 8000);
          } else {
            clearTimeout(nudgeTimer);
            nudgeTimer = null;
          }
        });
      }, { threshold: 0.3 });

      signupObserver.observe(signupSection);
    })();
```

- [ ] **Step 2: Проверить триггер**

Открой страницу, скролл до формы. Подожди 8 секунд — плашка должна плавно появиться.
Проверь кнопку × — плашка закрывается.
Обнови страницу — плашка не должна появляться снова (sessionStorage).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add trust nudge JS — IntersectionObserver + 8s timer"
```

---

### Task 4: Component A — Exit popup HTML + CSS

**Files:**
- Modify: `index.html` — CSS перед `</style>`, HTML перед `</body>`

- [ ] **Step 1: Добавить CSS**

Найди `</style>` (конец блока стилей). Вставь **перед** ним:

```css
    /* ===== EXIT POPUP ===== */
    .popup-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: overlayFadeIn 0.3s ease;
    }

    .popup-overlay.visible {
      display: flex;
    }

    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .popup {
      background: #fff;
      border-radius: 16px;
      padding: 36px 32px;
      max-width: 440px;
      width: 100%;
      position: relative;
      animation: popupSlideUp 0.3s ease;
      max-height: 90vh;
      overflow-y: auto;
    }

    @keyframes popupSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .popup__close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px;
      line-height: 1;
    }

    .popup__close:hover { color: var(--text); }

    .popup__close svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      display: block;
    }

    .popup__eyebrow {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    .popup__countdown {
      font-family: 'Cormorant', serif;
      font-size: 36px;
      font-weight: 300;
      color: var(--text);
      margin-bottom: 16px;
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .popup__countdown-sep {
      font-size: 20px;
      color: var(--border);
    }

    .popup__spots {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-dark);
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .popup__spots-dot {
      width: 6px;
      height: 6px;
      background: #4ADE80;
      border-radius: 50%;
      animation: pulse-dot 2s infinite;
    }

    .popup__trust {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 24px;
    }
```

- [ ] **Step 2: Добавить HTML разметку**

Найди `</body>` в конце файла. Вставь **перед** ним:

```html
  <!-- ===== EXIT INTENT POPUP ===== -->
  <div class="popup-overlay" id="exitPopup">
    <div class="popup">
      <button type="button" class="popup__close" id="popupCloseBtn">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <p class="popup__eyebrow">До события</p>
      <div class="popup__countdown">
        <span><span id="popupDays">3</span> дн.</span>
        <span class="popup__countdown-sep">·</span>
        <span><span id="popupHours">4</span> ч.</span>
        <span class="popup__countdown-sep">·</span>
        <span><span id="popupMinutes">22</span> мин.</span>
      </div>

      <div class="popup__spots">
        <span class="popup__spots-dot"></span>
        Осталось 8 мест из 12
      </div>

      <p class="popup__trust">Запись бесплатная. Телефон — только для подтверждения времени. Спам не отправляем.</p>

      <div id="popupFormWrap">
        <form id="exitForm">
          <div class="form-group">
            <label for="popupName">Имя</label>
            <input type="text" id="popupName" name="name" placeholder="Ваше имя" required>
          </div>
          <div class="form-group">
            <label for="popupPhone">Телефон</label>
            <input type="tel" id="popupPhone" name="phone" placeholder="+7 (___) ___-__-__" required>
          </div>
          <label class="form-checkbox">
            <input type="checkbox" id="popupConsent">
            <span class="form-checkbox__box">
              <svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg>
            </span>
            <span class="form-checkbox__text">
              Я даю согласие на <a href="privacy.html" target="_blank" rel="noopener">обработку персональных данных</a>
            </span>
          </label>
          <button type="submit" class="form-submit" id="popupSubmitBtn" disabled>Забронировать место</button>
        </form>
      </div>

      <div class="success" id="popupSuccess">
        <div class="success__icon">
          <svg viewBox="0 0 24 24"><polyline points="6,12 10,16 18,8"/></svg>
        </div>
        <h3 class="success__title" id="popupSuccessTitle">Место за вами!</h3>
        <p class="success__booking">Мы свяжемся для подтверждения времени</p>
      </div>
    </div>
  </div>
```

- [ ] **Step 3: Проверить отображение**

Временно добавь класс `visible` в HTML: `<div class="popup-overlay visible" id="exitPopup">`.
Открой страницу — должен появиться тёмный overlay и белый попап по центру: countdown, зелёный badge, текст доверия, форма.
После проверки **удали** `visible` из HTML.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add exit popup HTML and CSS"
```

---

### Task 5: Component A — Exit popup JS логика

**Files:**
- Modify: `index.html` — добавить в `<script>` блок перед `</script>`

- [ ] **Step 1: Добавить JS**

Найди `</script>` (закрывающий тег). Вставь **перед** ним:

```javascript
    // ===== EXIT INTENT POPUP =====
    (function () {
      function updatePopupCountdown() {
        var cd = getCountdown();
        document.getElementById('popupDays').textContent    = cd.days;
        document.getElementById('popupHours').textContent   = cd.hours;
        document.getElementById('popupMinutes').textContent = cd.minutes;
      }

      function openPopup() {
        if (sessionStorage.getItem(KEY_POPUP_SHOWN)) return;
        if (localStorage.getItem(KEY_SUBMITTED)) return;
        sessionStorage.setItem(KEY_POPUP_SHOWN, '1');
        updatePopupCountdown();
        document.getElementById('exitPopup').classList.add('visible');
        reachGoal('exit_popup_show');
      }

      function closePopup() {
        document.getElementById('exitPopup').classList.remove('visible');
      }

      // Close button
      document.getElementById('popupCloseBtn').addEventListener('click', closePopup);

      // Click on overlay (not on popup card)
      document.getElementById('exitPopup').addEventListener('click', function (e) {
        if (e.target === this) closePopup();
      });

      // Exit intent: mouse leaves through top of viewport
      document.addEventListener('mouseleave', function (e) {
        if (e.clientY < 10) openPopup();
      });

      // Consent → enable submit
      var popupConsent   = document.getElementById('popupConsent');
      var popupSubmitBtn = document.getElementById('popupSubmitBtn');
      popupConsent.addEventListener('change', function () {
        popupSubmitBtn.disabled = !popupConsent.checked;
      });

      // Phone mask (same logic as main form)
      document.getElementById('popupPhone').addEventListener('input', function (e) {
        var v = e.target.value.replace(/\D/g, '');
        if (v.startsWith('8')) v = '7' + v.slice(1);
        if (!v.startsWith('7') && v.length > 0) v = '7' + v;
        var f = '';
        if (v.length > 0) f = '+7';
        if (v.length > 1) f += ' (' + v.slice(1, 4);
        if (v.length > 4) f += ') ' + v.slice(4, 7);
        if (v.length > 7) f += '-' + v.slice(7, 9);
        if (v.length > 9) f += '-' + v.slice(9, 11);
        e.target.value = f;
      });

      // Form submit
      document.getElementById('exitForm').addEventListener('submit', function (e) {
        e.preventDefault();
        popupSubmitBtn.disabled = true;
        popupSubmitBtn.textContent = 'Отправка...';

        var name = document.getElementById('popupName').value;
        var data = { name: name, phone: "'" + document.getElementById('popupPhone').value };

        fetch('https://script.google.com/macros/s/AKfycbxSnfOJMrQrJVJPmAb2WPRIRZ-_FmfWAvCcrITDOB1aoEyAFv426FI8yPvS2PtZJ7rj/exec', {
          method: 'POST',
          body: JSON.stringify(data)
        })
        .then(function () { showPopupSuccess(name); })
        .catch(function () { showPopupSuccess(name); });
      });

      function showPopupSuccess(name) {
        document.getElementById('popupFormWrap').style.display = 'none';
        document.getElementById('popupSuccessTitle').textContent = name + ', место за вами!';
        document.getElementById('popupSuccess').classList.add('show');
        localStorage.setItem(KEY_SUBMITTED, 'true');
        document.getElementById('trustNudge').classList.remove('visible');
        reachGoal('exit_popup_submit');
        reachGoal('form_submit');
      }

      // Refresh countdown every minute
      setInterval(function () {
        updatePopupCountdown();
        var nudgeEl = document.getElementById('nudgeCountdown');
        if (nudgeEl) {
          var cd = getCountdown();
          nudgeEl.textContent = cd.days > 0 ? cd.days + ' дн.' : cd.hours + ' ч.';
        }
      }, 60000);
    })();
```

- [ ] **Step 2: Проверить exit intent на десктопе**

Открой страницу в браузере. Передвинь мышь быстро к адресной строке (вверх экрана) — попап должен появиться.
Проверь:
- Countdown показывает правильные числа
- Крестик закрывает попап
- Клик вне попапа (на overlay) закрывает попап
- Клик внутри попапа не закрывает его

- [ ] **Step 3: Проверить форму в попапе**

Кнопка «Забронировать» — disabled по умолчанию.
Поставить галочку → кнопка активируется.
Ввести имя + телефон, отправить → появляется success state с именем.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add exit popup JS — trigger, form, success state"
```

---

### Task 6: Интеграция — основная форма помечает submitted

**Files:**
- Modify: `index.html` — функция `showSuccess` в существующем `<script>` блоке

- [ ] **Step 1: Обновить функцию showSuccess**

Найди существующую функцию `showSuccess`:
```javascript
    function showSuccess(name, num) {
      form.style.display = 'none';
      successTitle.textContent = name + ', место за вами!';
      successBooking.textContent = 'Мы свяжемся для подтверждения времени';
      successMessage.classList.add('show');
      reachGoal('form_submit');
    }
```

Замени её на:
```javascript
    function showSuccess(name, num) {
      form.style.display = 'none';
      successTitle.textContent = name + ', место за вами!';
      successBooking.textContent = 'Мы свяжемся для подтверждения времени';
      successMessage.classList.add('show');
      localStorage.setItem(KEY_SUBMITTED, 'true');
      var nudge = document.getElementById('trustNudge');
      if (nudge) nudge.classList.remove('visible');
      reachGoal('form_submit');
    }
```

- [ ] **Step 2: Проверить интеграцию**

Отправь основную форму на странице. После успеха:
- Trust nudge должен скрыться (если был виден)
- Попробуй снова вызвать exit popup (переместить мышь вверх) — не должен появиться (localStorage)
- Обнови страницу (F5) — попап всё ещё не появляется (localStorage сохранился)

Для сброса состояния: `localStorage.removeItem('sunction_submitted')` в консоли.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: mark submitted in localStorage after main form, hide nudge"
```

---

### Task 7: Аналитика — три новых Metrika goal

**Files:**
- Modify: `index.html` — уже добавлены вызовы `reachGoal()` в Tasks 3 и 5, проверить корректность

- [ ] **Step 1: Проверить все goal-вызовы**

Убедись что в файле присутствуют (grep или поиск по тексту):
```
reachGoal('trust_nudge_show')   — в Task 3 (showNudge)
reachGoal('exit_popup_show')    — в Task 5 (openPopup)
reachGoal('exit_popup_submit')  — в Task 5 (showPopupSuccess)
reachGoal('form_submit')        — в Task 5 (showPopupSuccess) и в основном showSuccess
```

- [ ] **Step 2: Финальная ручная проверка сценариев**

**Сценарий 1 — Trust nudge:**
1. Открой страницу в мобильном режиме (DevTools, iPhone SE)
2. Скролл до формы, подожди 8 секунд
3. Плашка появляется
4. Крестик — скрывается
5. Обнови страницу — не появляется снова

**Сценарий 2 — Exit popup (десктоп):**
1. Открой страницу на десктопе (не мобиль)
2. Быстро перемести мышь к адресной строке
3. Попап появляется с countdown
4. Введи имя + телефон, поставь галочку, отправь
5. Success state с именем
6. Закрой попап, переместись мышью вверх — попап не появляется снова

**Сценарий 3 — Уже записан:**
1. `localStorage.setItem('sunction_submitted', 'true')` в консоли
2. Скролл к форме, жди 8с — nudge не появляется
3. Мышь вверх — popup не появляется
4. `localStorage.removeItem('sunction_submitted')` для сброса

- [ ] **Step 3: Final commit**

```bash
git add index.html
git commit -m "feat: popup conversion complete — exit intent + trust nudge"
```

---

## Итого: 7 задач, ≈ 12 коммитов

Все изменения в `index.html`. Никаких новых файлов.
