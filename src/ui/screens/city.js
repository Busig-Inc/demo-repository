/* Карта Торонто: места миссии. Посещённые отмечены, следующее непосещённое горит как «вы здесь». */
import { t, ic } from '../kit.js';
import { useStyles } from '../styles.js';
import { areasHTML, wireAreas } from '../areas.js';
import MISSION from '../../content/missions/insulin/index.js';
import { avatarStyle } from '../../content/portraits.js';

const sceneOf = (href) => (href.startsWith('scene/') ? href.slice(6) : href);

export function renderCity(root, { store, go, signal }) {
  useStyles('city');
  store.dispatch({ type: 'go', to: 'city' });
  const s = store.get();
  const visited = (p) => (p.href === 'council' ? false : s.visited.includes(sceneOf(p.href)));
  const firstOpen = MISSION.places.findIndex((p) => !visited(p));
  const L = MISSION.places.map((p, i) => ({ ...p, st: visited(p) ? 'done' : i === firstOpen ? 'active' : 'open' }));

  root.innerHTML = '<div class="viewport"><div class="stage" id="stage">'
    + '<div class="bar"><img src="logo/logo-mark.svg" alt="' + t('app.name') + '" width="44" height="44" style="flex:none;margin-top:-4px"><div class="case"><span class="lbl lamp">' + t('city.label') + '</span><h1>' + t('city.title') + '</h1></div>'
    + '<div class="prog"><span class="lbl">' + t('world.round') + '</span><div class="track"><i style="width:50%"></i></div></div>'
    + '<div class="tools"><button class="iconbtn" data-r="dossier" aria-expanded="false">' + ic('dossier') + '<span class="txt">' + t('nav.dossier') + '</span></button>'
    + '<button class="iconbtn" data-go="world" aria-label="Карта мира">' + ic('map') + '</button></div></div>'
    + '<div id="locs">' + L.map((d, i) => {
      const n = String(i + 1).padStart(2, '0');
      const inner = d.st === 'done' ? ic('done', 16) : n;
      const sub = d.st === 'active' ? t('city.hereWord') + ' · ' + d.date : d.st === 'done' ? t('city.stateDone') : d.date;
      return '<button class="loc ' + d.st + (d.lft ? ' lft' : '') + '" data-n="' + i + '" style="left:' + d.x + '%;top:' + d.y + '%" aria-label="' + n + '. ' + d.name + '. ' + sub + '"><span class="m">' + inner + '</span><span class="t"><b>' + d.name + '</b><small>' + sub + '</small></span></button>';
    }).join('') + '</div>'
    + '<div data-r="areas" style="position:absolute;z-index:5;left:clamp(14px,2.4cqw,32px);bottom:clamp(12px,2cqw,26px)">' + areasHTML(s) + '</div>'
    + '<div class="pop" data-r="pop" hidden></div>'
    + '<aside class="drawer" data-r="drawer" aria-hidden="true"><div class="head"><span class="lbl lamp" data-r="dLabel"></span><button class="close" data-r="close" aria-label="' + t('nav.close') + '">' + ic('close') + '</button></div>'
    + '<h2 data-r="dTitle"></h2><div class="where"><span>' + ic('place', 16) + '<span data-r="dPlace"></span></span><span>' + ic('date', 16) + '<span data-r="dDate"></span></span></div>'
    + '<p data-r="dText"></p><div class="people" data-r="dPeople"></div>'
    + '<div><span class="lbl">' + t('city.tasks') + '</span><ul class="tasks" data-r="dTasks" style="margin-top:8px"></ul></div>'
    + '<div class="ctx" data-r="ctx"><div class="top"><span data-r="dShelf"></span><span>' + t('city.ctx') + '</span></div>'
    + '<div class="stamp" aria-label="Факт"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" stroke-width="1"/><path id="spx" d="M50 50m-40 0a40 40 0 1 1 80 0a40 40 0 1 1-80 0" fill="none"/><text font-family="Jost,sans-serif" font-weight="600" font-size="9.6" letter-spacing="1.2" fill="currentColor"><textPath href="#spx" textLength="246" lengthAdjust="spacing">ФАКТ · АРХИВНЫЙ ИСТОЧНИК · </textPath></text><circle cx="50" cy="50" r="9" fill="currentColor"/></svg></div>'
    + '<p data-r="dCtx"></p><small>Источник: архив Университета Торонто, см. разбор</small></div>'
    + '<button class="btn" data-r="dGo"><span data-r="dGoText"></span>' + ic('next') + '</button></aside>'
    + '</div></div>';

  const $ = (r) => root.querySelector('[data-r="' + r + '"]');
  const drawer = $('drawer');
  let cur = Math.max(0, firstOpen);
  function show(i) {
    const d = L[i]; cur = i;
    const n = String(i + 1).padStart(2, '0');
    const state = { done: t('city.stateDone'), active: t('city.stateActive'), open: t('city.stateOpen') }[d.st];
    $('dLabel').textContent = t('city.place') + ' ' + n + ' · ' + state;
    $('dTitle').textContent = d.name; $('dPlace').textContent = d.place; $('dDate').textContent = d.date; $('dText').textContent = d.text;
    $('dPeople').innerHTML = d.people.map((p) => '<span class="person"><span class="ph"' + avatarStyle(p) + '></span>' + p + '</span>').join('');
    $('dTasks').innerHTML = d.tasks.map((x, k) => '<li><span>' + String(k + 1).padStart(2, '0') + '</span>' + x + '</li>').join('');
    $('ctx').hidden = !d.ctx; $('dCtx').textContent = d.ctx || ''; $('dShelf').textContent = t('city.shelf') + ' 02·' + n;
    $('dGoText').textContent = d.st === 'done' ? 'Вернуться: ' + d.name : d.go || t('city.enter');
    root.querySelectorAll('.loc').forEach((b, k) => b.classList.toggle('sel', k === i));
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); $('dossier').setAttribute('aria-expanded', 'true');
  }
  const hide = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); $('dossier').setAttribute('aria-expanded', 'false'); };
  const closePop = wireAreas(root, $('pop'), store, { signal });
  root.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
    const l = e.target.closest('.loc'); if (l) return show(+l.dataset.n);
    if (e.target.closest('[data-r="dGo"]')) go(L[cur].href);
    if (e.target.closest('[data-r="dossier"]')) drawer.classList.contains('open') ? hide() : show(cur);
    if (e.target.closest('[data-r="close"]')) hide();
  }, { signal });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closePop(); return hide(); }
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
    const ls = [...root.querySelectorAll('.loc')]; const i = ls.indexOf(document.activeElement);
    e.preventDefault(); ls[i < 0 ? (k > 0 ? 0 : ls.length - 1) : (i + k + ls.length) % ls.length].focus();
  }, { signal });
  show(cur);
}
