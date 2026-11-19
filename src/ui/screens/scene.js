/* Экран сцены (перенос content/scene.js из дизайн-пакета на состояние игры).
   Рисует картинку, реплику, кнопки действий, окна и три области. Окно сообщает результат,
   сцена превращает его в эффект из данных и отправляет в store. */
import { t, ic, mark, esc, fitStage } from '../kit.js';
import { areasHTML, wireAreas } from '../areas.js';
import { WINDOWS } from '../windows/index.js';
import { useStyles } from '../styles.js';

const actKey = (sceneId, id) => sceneId + '.' + id;

export function renderScene(root, S, { store, go, signal, kind = 'scene' }) {
  useStyles('scene');
  const st = () => store.get();
  const isDone = (id) => { const a = S.actions.find((x) => x.id === id); return a?.done ? a.done(st()) : !!st().acts?.[actKey(S.id, id)]; };
  const isOpen = (a) => !a.when || a.when(st());
  const portrait = S.speaker.portrait
    ? ' style="background-image:url(' + S.speaker.portrait + '),var(--img-portrait);background-size:cover,520%;background-position:center top,60% 30%;background-repeat:no-repeat"'
    : '';
  const showBack = S.back === 'city' && !st().plan;

  root.innerHTML = '<div class="fit"><div class="stage" id="stage" style="background-image:var(--img-scene-' + S.bg + ')">'
    + '<div class="top"><img src="logo/logo-mark.svg" alt="' + t('app.name') + '" width="44" height="44" style="flex:none;margin-top:-4px">'
    + (showBack ? '<button class="iconbtn" data-go="city">' + ic('back', 20) + '<span>' + t('ui.toCity') + '</span></button>' : '')
    + '<div class="where"><span class="lbl lamp">' + S.label + '</span><h1>' + S.title + '</h1></div>'
    + '<div data-r="areas">' + areasHTML(st()) + '</div>'
    + '<div class="tools"><button class="iconbtn" data-r="help" aria-label="' + t('nav.help') + '">' + ic('help', 20) + '</button></div></div>'
    + '<section class="dlg' + (S.speaker.narrator ? ' nop' : '') + '" aria-label="' + t('s1.talkAria') + '">'
    + '<div class="arch" role="img" aria-label="' + esc(S.speaker.name) + '"' + portrait + '></div>'
    + '<div><div class="who"><b>' + esc(S.speaker.name) + '</b><span>' + esc(S.speaker.role) + '</span></div>'
    + '<p class="sline">' + S.lines[0] + '</p><p class="answer" data-r="answer" hidden aria-live="polite"></p>'
    + '<div class="ask-row">' + (S.topics || []).filter((q) => q.a).map((q, i) => '<button class="topic" data-q="' + i + '"><span class="qm">?</span>' + q.t + '</button>').join('') + '</div>'
    + (kind === 'scene' ? '<span class="stampm">' + mark('game') + ' · ' + t('s1.stamp').split(' · ')[1] + '</span>' : '')
    + '</div></section>'
    + '<div class="acts" data-r="acts"></div>'
    + '<section class="win closed" data-r="win" role="dialog" aria-modal="false" aria-label=""><div class="wh"><span class="lbl lamp" data-r="wk">' + t('ui.actionKicker') + '</span><button class="winx" data-r="winx" aria-label="' + t('ui.close') + '">' + ic('close', 20) + '</button></div><div class="wb" data-r="wb"></div><div class="wf" data-r="wf"></div></section>'
    + '<div class="pop" data-r="pop" hidden></div><div class="toast" data-r="toast" role="status"></div></div></div>';

  const $ = (r) => root.querySelector('[data-r="' + r + '"]');
  const stage = root.querySelector('#stage');
  const win = $('win'), pop = $('pop');
  fitStage(stage, signal);

  /* Вход: сначала картинка, потом окна. Клик или клавиша показывают всё сразу. */
  stage.classList.add('intro');
  const showAll = () => { stage.classList.remove('intro'); stage.classList.add('shown'); };
  const hold = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-scene-hold')) || 1.2) * 1000;
  const timer = setTimeout(showAll, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : hold);
  signal.addEventListener('abort', () => clearTimeout(timer));
  addEventListener('keydown', showAll, { signal, once: true });
  stage.addEventListener('click', showAll, { signal, once: true });

  const topics = (S.topics || []).filter((q) => q.a);
  root.querySelector('.ask-row').addEventListener('click', (e) => {
    const b = e.target.closest('.topic'); if (!b) return;
    const q = topics[+b.dataset.q];
    $('answer').textContent = q.a; $('answer').hidden = false;
    b.classList.add('asked'); b.innerHTML = ic('done', 16) + q.t;
  }, { signal });

  const nextOf = () => (typeof S.next === 'function' ? S.next(st()) : S.next);
  function drawActs() {
    const ready = (S.required || []).every(isDone);
    const n = nextOf();
    $('acts').innerHTML = S.actions.map((a) => {
      const open = isOpen(a);
      return '<button class="act2' + (isDone(a.id) ? ' done' : '') + '" data-w="' + a.id + '"' + (open ? '' : ' aria-disabled="true"') + '>'
        + '<span>' + a.label + '<small>' + (open ? a.hint || '' : a.whenHint || '') + '</small></span>'
        + '<span class="tick">' + ic(open ? 'done' : 'locked', 20) + '</span></button>';
    }).join('')
      + (S.links || []).map((l) => '<button class="act2 link" data-go="' + l.href + '"><span>' + l.label + (l.hint ? '<small>' + l.hint + '</small>' : '') + '</span>' + ic('next', 20) + '</button>').join('')
      + '<button class="cta2" data-r="next" aria-disabled="' + (ready ? 'false' : 'true') + '"' + (ready ? '' : ' title="Сначала выполните главное действие"') + '><span>' + n.label + '</span>' + ic('next', 20) + '</button>';
  }
  const refresh = () => { $('areas').innerHTML = areasHTML(st()); drawActs(); };
  drawActs();

  const closePop = wireAreas(root, pop, store, { signal, onOpen: () => win.classList.add('closed') });
  const closeWin = () => { if (!win.classList.contains('closed')) { win.classList.add('closed'); lastOpener?.focus(); } };
  let lastOpener = null;
  const say = (m) => { const el = $('toast'); el.innerHTML = ic('done', 20) + m; el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 2600); };

  function openWin(a, opener) {
    closePop();
    lastOpener = opener || null;
    const w = a.window;
    // Новые узлы на каждое открытие: обработчики прошлого окна не копятся.
    const body = $('wb').cloneNode(false), foot = $('wf').cloneNode(false);
    $('wb').replaceWith(body); $('wf').replaceWith(foot);
    body.innerHTML = '<h2>' + w.title + '</h2>'; foot.innerHTML = '';
    win.setAttribute('aria-label', w.title);
    let first = true;
    WINDOWS[w.type](w, {
      root: win, body, foot, state: st(), store, go,
      msg: (o) => (a.msg ? a.msg(o) : null),
      done: (outcome) => {
        if (!a.effect) return;
        const fx = [].concat(a.effect(outcome, st()) || []);
        store.dispatch([{ type: 'act', scene: S.id, id: a.id }, ...fx]);
        refresh();
        if (first && ['pack', 'choice', 'assign', 'match', 'offers'].includes(w.type)) say(t('ui.done'));
        first = false;
      },
    });
    win.classList.remove('closed');
    showAll();
    (win.querySelector('.wb button, .wb select, .wf button') || $('winx')).focus({ preventScroll: true });
  }
  S.openWin = openWin;

  root.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { go(g.dataset.go); return; }
    const b = e.target.closest('.act2[data-w]');
    if (b) {
      const a = S.actions.find((x) => x.id === b.dataset.w);
      if (!isOpen(a)) { say(a.whenHint || ''); return; }
      openWin(a, b); return;
    }
    if (e.target.closest('[data-r="next"]')) {
      if ((S.required || []).every(isDone)) {
        const n = nextOf();
        if (n.effect) store.dispatch(n.effect);
        go(n.href);
      } else say('Сначала: ' + S.actions.filter((a) => (S.required || []).includes(a.id) && !isDone(a.id)).map((a) => a.label).join(', '));
    }
  }, { signal });
  $('winx').addEventListener('click', closeWin, { signal });
  $('help').addEventListener('click', () => openWin({ id: 'help', window: { type: 'help', title: t('help.title') } }, $('help')), { signal });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!win.classList.contains('closed')) closeWin(); else closePop(); } }, { signal });

  return { refresh, openWin, say };
}
