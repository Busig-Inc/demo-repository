# MVP «Инсулин»: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сайт на GitHub Pages с миссией «Инсулин», в которой маршруты H, L, N и запасной W проходятся от старта до личного разбора, а финал и разбор вычисляются из решений игрока.

**Architecture:** Одностраничное приложение. `src/engine/` это чистые функции без DOM: состояние, эффекты, правила, разбор. `src/content/` это данные миссии. `src/ui/` это экраны и окна, перенесённые из дизайн-пакета. Экран сообщает движку результат окна, движок применяет эффект из данных, состояние сохраняется в `localStorage`.

**Tech Stack:** Vite 8, чистый JavaScript (ES-модули), Vitest, Playwright (уже установлен в окружении), GitHub Actions + Pages.

**Spec:** `docs/superpowers/specs/2026-11-19-insulin-mvp-design.md`. Источник текстов и чисел: `architecture-financing-game/source/сценарий_миссии_Инсулин.md` и `architecture-financing-game/content/mission.insulin.js`.

## Global Constraints

- Холст сцены 1280×720 масштабируется целиком (`scale(min(innerWidth/1280, innerHeight/720))`). Проверка на 1440×900 и 1280×720.
- Стили `tokens.css`, `components.css`, `scene.css`, `fonts.css`, `assets.css` переносятся из пакета без изменения правил:
  - один радиус `--r` 20 px;
  - янтарь только у доступного сейчас действия;
  - текст только на светлой плашке;
  - метки «Архив» и «Допущение игры» обязательны.
- Тексты интерфейса берутся только из `src/content/texts.ru.js` через `t(key)`. Тексты миссии только из `src/content/missions/insulin/`.
- Деньги только в условных единицах. Свободный резерв 3, дар 4 (целевой, только аппарат), натура: H 1, P 6.
- Сохранение: ключ `localStorage` `afg.insulin`, поле `v: 1`.
- `vite.config.js`: `base: './'`. Маршрутизация через hash.
- Esc закрывает верхний слой. Всё доступно с клавиатуры. `prefers-reduced-motion` отключает анимации.
- P и F видны, но закрыты с текстом `t('plan.nextVersion')` = «Маршрут появится в следующей версии».

## Review Focus

1. **Обновление страницы посреди миссии или после подписи.** Игрок возвращается на тот же экран с тем же состоянием, подпись остаётся. Тест в задаче 2 (`save` + `load` после `sign`).
2. **Испорченное или старое сохранение** (не JSON или `v` ≠ 1). Начинается новая игра, на старте показывается сообщение `t('save.reset')`, исключения нет. Тест в задаче 2.
3. **Назад в браузере или прямой адрес `#/scene/s4` после подписи.** Места до S7 закрыты, роутер ведёт на текущий шаг. Тест `guardRoute` в задаче 3.
4. **Игрок отказался и от дара, и от Морроу.** W доступен, тупика нет. Тест в задаче 3.
5. **Прямой адрес `#/final` или `#/review` до подписи.** Роутер ведёт на карту Торонто. Тест `guardRoute` в задаче 3.

---

### Task 1: Каркас, ресурсы, CI и Pages

**Files:**
- Delete: `package.json` (зависимость Primer), `index.html` (шаблон), `.github/workflows/proof-html.yml`, `.github/workflows/auto-assign.yml`
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/ui/router.js`, `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `.gitignore`, `tests/smoke.test.js`
- Copy из пакета в `public/`: `fonts/`, `icons/`, `stamps/`, `logo/`, `img/scenes/`, `img/maps/`, `img/portraits/*.jpg` (без `sheets/`), `img/lab.jpg`
- Copy в `src/styles/`: `tokens.css`, `components.css`, `scene.css`, `fonts.css`, `assets.css`. Пути внутри поправить так, чтобы они вели к `public/`, то есть абсолютные от корня сборки: `url(./img/…)` в `assets.css` загружается через `index.html`.

**Interfaces:**
- Produces: `router.start(routes: Record<string, (params) => void>)` и `router.go(path: string)`. Маршруты: `#/start`, `#/world`, `#/city`, `#/scene/:id`, `#/council`, `#/final`, `#/review`.

- [ ] Тест: `tests/smoke.test.js` проверяет, что `parseHash('#/scene/s3')` возвращает `{name:'scene', id:'s3'}`, а `parseHash('')` возвращает `{name:'start'}`. `parseHash` экспортируется из `router.js`.
- [ ] `npm i -D vite vitest`. Скрипты: `dev`, `build`, `preview`, `test` (`vitest run`).
- [ ] `index.html`: `<div id="app">`, `lang="ru"`, `<script type="module" src="/src/main.js">`. Подключение Google Fonts не нужно, шрифты локальные.
- [ ] `ci.yml`: на каждый push и pull_request выполняет `npm ci`, `npm test`, `npm run build`. `pages.yml`: на push в `main` и вручную (workflow_dispatch) выполняет `actions/configure-pages`, сборку, `upload-pages-artifact` (`dist`) и `deploy-pages`. Права `pages: write`, `id-token: write`.
- [ ] `npm test` проходит, `npm run build` проходит, в `dist/img/scenes/lab.jpg` файл есть.
- [ ] Commit `chore: каркас Vite, ресурсы дизайн-пакета, CI и деплой Pages`.

### Task 2: Состояние, эффекты, журнал, сохранение

**Files:** Create `src/engine/state.js`, `src/engine/save.js`. Test `tests/engine.state.test.js`.

**Interfaces:**
- Produces:
  - `createState(): State`.
  - `apply(state: State, effect: Effect | Effect[]): State`. Чистая функция: не мутирует `state`, добавляет запись `{scene, type, value}` в `state.journal`.
  - `save(state)`, `load(): {state: State|null, reset: boolean}`, `clearSave()`.
- Форма `State`:
  ```js
  { v:1, at:'start', visited:[], folder:[], journal:[],
    request:null /*'full'|'invoice'*/, costsSeenAt:null /*'S1'|'S7'*/, hospital:null /*'honest'|'overpromise'*/,
    offers:{ gift:'none', exchange:'none', pilot:'none', morrowN:'none', morrowF:'none' },
    researchPlaced:false, plan:null, wAlloc:null /*{group,method,research}:bool*/, riskApproved:false,
    s8:{ compared:false, cycle:false }, s8n:{ advance:false, refund:false }, s9:null, snapshots:{} }
  ```
- Типы `Effect` (полный список, остальные `apply` отвергает с ошибкой):
  - `go{to}`, `visit{scene}`, `doc{id}`, `request{full:bool}`, `hospital{status}`;
  - `offer{key, value}`, где gift: `seen|accepted|declined`, exchange: `broad|narrow|refused`, pilot: `seen`, morrowN: `seen|taken|declined`, morrowF: `seen`;
  - `research{}`, `risk{}`, `sign{plan, wAlloc?}`;
  - `s8{step:'compared'|'cycle'}`, `s8n{step:'advance'|'refund'}`, `s9{choice:'control'|'research'|'reserve'}`.
- Правила внутри `apply`:
  - `sign` пишет `snapshots.beforeSign` (копию состояния до подписи). Если `request` равен `invoice`, `sign` ставит `costsSeenAt = 'S7'`, а `request{full:true}` до подписи ставит `costsSeenAt = 'S1'`.
  - `s9` пишет `snapshots.beforeS9`.
  - Повторная `sign` после подписи отвергается.

- [ ] Тесты:
  - `apply` не мутирует исходное состояние;
  - `sign` создаёт `snapshots.beforeSign`, в котором `plan === null`;
  - второй `sign` бросает ошибку;
  - неизвестный тип эффекта бросает ошибку;
  - после `save` и `load` состояние совпадает;
  - `load` при строке `"{oops"` возвращает `{state:null, reset:true}`, при `v:0` тоже `reset:true`, при пустом хранилище `reset:false`.
- [ ] Реализация, тесты проходят, commit `feat(engine): состояние, эффекты и сохранение`.

### Task 3: Правила: планы, смета, финал, охрана маршрутов

**Files:** Create `src/engine/rules.js`. Test `tests/engine.rules.test.js`.

**Interfaces:**
- Consumes: `State`, `apply`, `createState`.
- Produces:
  - `planAvailability(state) → {L,H,P,W,N,F: {open:boolean, reason:string|null, next?:true}}`. Правила доступности:
    - L: `gift==='accepted'`;
    - H: L и `exchange==='narrow'`;
    - N: `morrowN==='taken'`;
    - W: открыт всегда;
    - P, F: `{open:false, next:true}`.
    - Причины закрытия это ключи словаря: `plan.needGift`, `plan.needExchange`, `plan.needMorrow`.
  - `ledger(state) → {free:{total:3, spent:[{work, cost}], left}, target:{total, spent, status:'none'|'pending'|'confirmed'}, kind:{total, used}, debt:number, deferred:string[]}`.
  - `resolveFinal(state) → 'h'|'l'|'r'|'n'|'w'|null`. Финал наступает, когда пройден последний обязательный шаг маршрута:
    - H: после `s9`;
    - L: после `s9`, при `control` финал `l`, иначе `r`;
    - N: после `s8n`;
    - W: сразу после подписи.
  - `stepAfterSign(state) → 'scene/s8'|'scene/s8n'|'scene/s9'|'final'`.
  - `guardRoute(state, route) → route` (возвращает разрешённый маршрут):
    - после подписи сцены s1–s6, s5m, город и совет ведут на `stepAfterSign`;
    - до подписи `final`, `review`, `s8`, `s8n`, `s9` ведут на `city`;
    - `review` разрешён, только когда `resolveFinal` не null.

- [ ] Тесты (значения из таблицы сценария «Расходы и последовательность»):

| Маршрут | free.left | target.spent | kind.used | debt | final |
|---|---|---|---|---|---|
| L + control | 0 | 4 | 0 | 0 | `l` |
| L + research | 0 | 4 | 0 | 0 | `r` |
| L + reserve | 1 | 4 | 0 | 0 | `r` |
| H + research | 0 | 4 | 1 | 0 | `h` |
| H + reserve | 1 | 4 | 1 | 0 | `h` |
| N | 0 | 0 | 0 | 0 | `n` |
| W {group,method,research} | 0 | 0 | 0 | 0 | `w` |
| W {group} | 2 | 0 | 0 | 0 | `w` |

  Дополнительно:
  - `deferred` у L+control содержит `research`, у L+research содержит `control`;
  - при `gift:'declined', morrowN:'declined'` открыт только W;
  - H закрыт с `plan.needExchange` при `exchange:'broad'`;
  - `sign{plan:'L'}` без дара бросает ошибку, для этого `apply` вызывает `planAvailability`;
  - `guardRoute` после подписи L для `scene/s4` возвращает `scene/s8`;
  - `guardRoute` до подписи для `final` возвращает `city`.
- [ ] Реализация, тесты проходят, commit `feat(engine): правила планов, смета, финал, охрана маршрутов`.

### Task 4: Движок разбора

**Files:** Create `src/engine/review.js`. Test `tests/engine.review.test.js`.

**Interfaces:**
- Consumes: `ledger`, `resolveFinal`, `apply`. Данные `review` миссии (задача 5): `opportunities[]`, `causes[]`.
- Produces:
  - `pathSteps(state, content) → [{scene, title, text}]`. Строится по журналу: на одну запись сцены одна строка, текст из `content.pathText[type][value]`.
  - `opportunityMap(state, content) → [{id, title, status:'used'|'declined'|'missed'|'seen', note}]`. Возможности: `fullRequest`, `gift`, `exchange`, `pilot`, `research`, `hospital`, `morrow`. У `pilot` в этой версии статус `seen` или `missed`, это не упрёк.
  - `causeChains(state, content) → [{known, action, outcome, basis}]`. Выбираются строки таблицы «Причины, условия» по пути: S1 всегда; S4 при даре; S5 при `narrow`; S9L при L; S9H при H; S5M и S8N при N; S10W при W. Выбирается от 2 до 4 строк.
  - `alternatives(state) → [{id:'plan:L'|'plan:H'|'plan:N'|'plan:W'|'s9:control'|'s9:research'|'s9:reserve', label}]`. План предлагается только если он был открыт в `snapshots.beforeSign` и отличается от подписанного. Варианты S9 предлагаются только при L или H.
  - Решение «обмен с Клоузом» из спецификации 6.5 представлено альтернативой `plan:H` ↔ `plan:L`: обмен с границами и есть то, что отличает H от L.
  - `counterfactual(state, altId) → {final, ledger, diff:[{row, was, now}]}`. Берёт снапшот, применяет новое решение и достраивает маршрут по умолчанию:
    - S8 пройден;
    - для S9 сохраняется прежний выбор, если он допустим, иначе L получает `control`, а H `research`;
    - W получает `{group, method, research}`.
    - Строки `diff`: владелец аппарата, кто оплатил контроль, обязанности по данным, исследование, свободный остаток, долг.
  - `restoreFrom(state, altId) → State`. Возвращает снапшот с меткой `replayOf`, исходный журнал сохраняется в `state.original`.

- [ ] Тесты:
  - путь H с исследованием: `opportunityMap` даёт `gift:'used'`, `exchange:'used'`, `research:'used'`;
  - путь N: `gift` равен `missed` или `declined`, `morrow` равен `used`, а `note` упоминает невозвратный аванс 3;
  - `alternatives` после H (L, H, N открыты) содержит `plan:L` и `plan:N` и не содержит `plan:H`;
  - `counterfactual(Hstate,'plan:L')` даёт `final` `l` и строку `diff` «Кто оплатил контроль»: было «Партнёр, в натуре», стало «Свободный резерв Connaught»;
  - `counterfactual(Lcontrol,'s9:research')` даёт `final` `r`;
  - `invoice` в S1 даёт шаг пути с `costsSeenAt` равным S7.
- [ ] Реализация, тесты проходят, commit `feat(engine): разбор, карта возможностей, альтернативы`.

### Task 5: Данные миссии

**Files:**
- Create `src/content/texts.ru.js` (из пакета плюс новые ключи: `plan.*`, `save.*`, `review.*`, `demo.*`).
- Create `src/content/missions/insulin/{index.js, places.js, scenes.js, plans.js, finals.js, review.js, presets.js}`.
- Test `tests/content.test.js`.

**Interfaces:**
- Produces: `MISSION = {id, world, places, scenes, plans, finals, review, presets}` (default export из `index.js`).
  - **Действие сцены:** `{id, label, hint, window, effect:(outcome)=>Effect|Effect[]}`. `outcome` это результат окна (задача 6): `{ok:boolean, value:any}`.
  - **Сцены:** `next` может быть функцией `(state)=>{label, href}`.
  - **Финалы:** `rows:(ledger, state)=>[[label, text]]`.
- Перенос и дописывание:
  - S0–S6 и S5M берутся из `mission.insulin.js` с эффектами:
    - S1 `request` (pack: полный набор даёт `request{full:true}`, иначе `request{full:false}`);
    - S2 `status` (choice: `good` даёт `honest`, иначе `overpromise`);
    - S4 `gift` (offers: «Принять» даёт `accepted`, «Отказаться» даёт `declined`, «Спросить о свободном использовании» меняет только текст);
    - S5 `exchange` (pack: всё отправлено даёт `broad` и ответ Маклеода с возможностью сузить, выделенные границы дают `narrow`, отказ даёт `refused`). Карточка пилота даёт `offer{pilot:seen}`, кнопки «взять в папку» у неё нет, есть пометка `plan.nextVersion`;
    - S5M: N «Взять в папку» даёт `taken`, F даёт `seen` и закрыт пометкой;
    - S6 `block` даёт `research{}`.
  - S7 (`plans.js`): L, H, P, W, N, F с полями `rows` из пакета. Для N добавляется отдельное подтверждение риска (эффект `risk{}` перед `sign`). Для W окно распределения трёх работ по 1.
  - S8 (L/H), S8N и S9 в вариантах L и H: тексты дописываются по сценарию (разделы S8, S8N, S9).
  - Финалы `h, l, r, n, w` с динамическими строками. `f` и `p` переносятся с флагом `next:true`.
  - `review.js`: `pathText`, `opportunities`, `causes` (строки таблицы «Причины, условия»), `facts` (историческая справка с источниками и меткой `archive`), `fields` (5 полей записки).
  - `presets.js`: `presetBeforeCouncil(route:'H'|'L'|'N') → State`. Состояния собраны через `apply` из реальных эффектов, без ручного JSON.
- [ ] Тесты:
  - у каждого действия тип окна из списка задачи 6;
  - каждый `effect` для каждого варианта даёт эффект, который принимает `apply`;
  - у каждой сцены `next` и `links` ведут на существующий маршрут;
  - каждый пресет проходит `planAvailability` для своего плана;
  - у каждого текста сценария с историческим фактом есть `mark`.
- [ ] Commit `feat(content): данные миссии «Инсулин» с эффектами и пресетами`.

### Task 6: Сцена, окна, три области

**Files:**
- Create `src/ui/kit.js` (`ic`, `units`, `mark`, `t`, `plural`), `src/ui/stage.js`, `src/ui/areas.js`.
- Create `src/ui/windows/{doc,pack,choice,offers,assign,match,calendar,compare,final,timeline,facts,note,opportunities,counterfactual}.js`, `src/ui/windows/index.js`.
- Create `src/ui/screens/scene.js`.

**Interfaces:**
- Consumes: `MISSION`, `apply`, `ledger`, `save`, `router.go`.
- Produces:
  - Окно: `render(win, {body, foot, done:(outcome)=>void, state})`.
  - Сцена: `renderScene(root, sceneId, store)`, где `store = {get():State, dispatch(effect)}`. `dispatch` применяет эффект, сохраняет состояние и перерисовывает области.
  - Области: `renderAreas(el, state)`. Папка, смета и календарь строятся из `state` и `ledger(state)`, а не из полей сцены.
- Перенос из `content/scene.js` пакета по типам окон без изменения разметки и классов. Дополнения:
  - `offers` и `pack` вызывают `done(outcome)` со значением;
  - вход в сцену (`--t-scene-hold`) и пропуск по клику или клавише сохраняются;
  - Esc закрывает окно, затем панель;
  - у портрета есть запасная монограмма, если картинка не загрузилась (`onerror`).
- [ ] Проверка: `npm run dev`, затем Playwright открывает `#/scene/s1`. Скриншот 1440×900 показывает фон лаборатории, портрет Скотта, кнопки «Журнал» и «Запрос», ошибок в консоли нет. После полного запроса в S1 смета в шапке не меняется (3 ед.), а в журнале состояния есть `request:'full'`.
- [ ] Commit `feat(ui): сцена, окна и три области на состоянии`.

### Task 7: Экраны старта, карт, совета, финала и разбора

**Files:** Create `src/ui/screens/{start,world,city,council,final,review}.js` и `src/styles/screens.css`. CSS берётся из inline-стилей `экран_старт.html`, `экран_мир.html`, `экран_город.html`, `экран_план.html`.

**Interfaces:**
- Consumes: всё из задач 2–6.
- Поведение:
  - **Старт:** «Начать», «Продолжить» (если есть сохранение) и скромная ссылка «Показ маршрутов». Ссылка открывает три входа H, L, N; каждый вызывает `presetBeforeCouncil` и ведёт на `#/council`. При `load().reset` показывается `t('save.reset')`.
  - **Карта мира:** открыт только Торонто.
  - **Город:** места из `places.js`. Посещённые отмечены, после подписи места закрыты с причиной.
  - **Совет:** шесть карточек по `planAvailability`, у закрытой видна причина. Для N отдельное подтверждение риска с размером 3. Для W распределение трёх работ. Подпись проходит через окно подтверждения «Подписать рабочую часть» и затем ведёт на `stepAfterSign`.
  - **Финал:** текст и строки из `finals[resolveFinal]`, кнопка «К разбору».
  - **Разбор:** вкладки по порядку спецификации 6.5: путь, возможности, почему так вышло, как было на самом деле, изменить одно решение, записка.
    - «Изменить одно решение» показывает `alternatives`, затем две карточки (`counterfactual`) и кнопку «Пройти отсюда» (`restoreFrom`).
    - Записка отклоняет «найти финансирование» без адресата и сохраняется. Кнопка «Скачать записку» выгружает `.txt`.
- [ ] Проверка Playwright по всем экранам: скриншоты 1440×900, нет ошибок в консоли, Tab доходит до главной кнопки, Esc закрывает окно.
- [ ] Commit `feat(ui): старт, карты, совет, финал, разбор`.

### Task 8: Сквозная проверка маршрутов и полировка

**Files:** Create `tests/e2e/routes.mjs` (Playwright-скрипт, запускается против `npm run preview`, в `vitest` не входит). Create `docs/АРХИТЕКТУРА.md`, `docs/КАК_ДОБАВИТЬ_МАРШРУТ.md`. Modify `README.md`.

- [ ] `routes.mjs` проходит полным ходом маршруты H+research, L+control, L+research, N, W и пресеты H/L/N. Для каждого проверяет код финала на экране, наличие разбора и альтернатив и отсутствие ошибок в консоли, на 1440×900 и 1280×720.
- [ ] Обновить страницу после подписи: экран и смета те же.
- [ ] Запустить `impeccable detect --json --changed`, исправить найденное. Затем визуальная сверка скриншотов с макетами пакета.
- [ ] Документация:
  - `АРХИТЕКТУРА.md`: слои, поток «окно → эффект → состояние → экран», где что править;
  - `КАК_ДОБАВИТЬ_МАРШРУТ.md`: на примере P, какие данные и правила дописать и какой тест добавить;
  - `README.md`: запуск, деплой, включение Pages.
- [ ] Commit `test: сквозные маршруты; docs: архитектура и расширение`, затем push в `claude/exciting-sagan-lrk6tz`.
