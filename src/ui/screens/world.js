/* Карта мира: выбор кейса. В MVP открыт только «Инсулин». */
import { t, ic, paint } from '../kit.js';
import { useStyles } from '../styles.js';
import MISSION from '../../content/missions/insulin/index.js';

export function renderWorld(root, { store, go, signal }) {
  useStyles('world');
  const L = MISSION.world;
  const hrefFor = (d) => (d.st === 'active' ? (store.get().visited.includes('s0') ? 'city' : 'scene/s0') : null);
  root.innerHTML = '<div class="viewport"><div class="stage" id="stage">'
    + '<div class="bar"><div class="case"><img src="logo/logo-horizontal.svg" alt="' + t('app.name') + '" style="width:230px;height:auto;display:block;margin-bottom:6px"><span class="lbl lamp">' + t('world.label') + '</span></div>'
    + '<div class="tools"><button class="iconbtn" data-r="dossier" aria-expanded="false">' + ic('dossier') + '<span class="txt">' + t('nav.dossier') + '</span></button>'
    + '<button class="iconbtn" data-go="start" aria-label="' + t('nav.back') + '">' + ic('back') + '</button></div></div>'
    + '<div id="locs">' + L.map((d, i) => {
      const n = String(i + 1).padStart(2, '0');
      const inner = d.st === 'locked' ? ic('locked', 16) : n;
      const sub = d.st === 'active' ? t('world.legendHere') + ' · ' + d.date : d.date;
      return '<button class="loc ' + d.st + (d.lft ? ' lft' : '') + '" data-n="' + i + '" style="left:' + d.x + '%;top:' + d.y + '%" aria-label="' + n + '. ' + d.name + '. ' + sub + '"><span class="m">' + inner + (d.st === 'active' ? SPARK : '') + '</span><span class="t"><b>' + d.name + '</b><small>' + sub + '</small></span></button>';
    }).join('') + '</div>'
    + '<div class="legend" aria-label="' + t('world.legend') + '"><span><i class="m a"></i><span>' + t('world.legendHere') + '</span></span><span><i class="m"></i><span>' + t('world.legendOpen') + '</span></span><span><i class="m l"></i><span>' + t('world.legendSoon') + '</span></span></div>'
    + '<aside class="drawer" data-r="drawer" aria-hidden="true"><div class="head"><span class="lbl lamp" data-r="dLabel"></span><button class="close" data-r="close" aria-label="' + t('nav.close') + '">' + ic('close') + '</button></div>'
    + '<h2 data-r="dTitle"></h2><div class="where"><span>' + ic('place', 16) + '<span data-r="dPlace"></span></span><span>' + ic('date', 16) + '<span data-r="dDate"></span></span></div>'
    + '<p data-r="dText"></p><button class="btn" data-r="dGo"><span data-r="dGoText"></span>' + ic('next') + '</button></aside>'
    + '</div></div>';
  paint(root);
  const $ = (r) => root.querySelector('[data-r="' + r + '"]');
  const drawer = $('drawer');
  let cur = L.findIndex((d) => d.st === 'active');
  function show(i) {
    const d = L[i]; cur = i;
    const n = String(i + 1).padStart(2, '0');
    $('dLabel').textContent = t('world.case') + ' ' + n + ' · ' + { active: t('world.stateActive'), open: t('world.stateOpen'), locked: t('world.stateLocked') }[d.st];
    $('dTitle').textContent = d.name; $('dPlace').textContent = d.place; $('dDate').textContent = d.date; $('dText').textContent = d.text;
    const href = hrefFor(d);
    $('dGo').disabled = !href;
    $('dGoText').textContent = href ? (store.get().visited.includes('s0') ? t('world.continue') : d.go) : t('world.locked');
    root.querySelectorAll('.loc').forEach((b, k) => b.classList.toggle('sel', k === i));
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); $('dossier').setAttribute('aria-expanded', 'true');
  }
  const hide = () => { root.querySelectorAll('.loc.sel').forEach((b) => b.classList.remove('sel')); drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); $('dossier').setAttribute('aria-expanded', 'false'); };
  root.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
    const l = e.target.closest('.loc'); if (l) return show(+l.dataset.n);
    if (e.target.closest('[data-r="dGo"]')) { const h = hrefFor(L[cur]); if (h) go(h); }
    if (e.target.closest('[data-r="dossier"]')) drawer.classList.contains('open') ? hide() : show(cur);
    if (e.target.closest('[data-r="close"]')) hide();
  }, { signal });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return hide();
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
    const ls = [...root.querySelectorAll('.loc')]; const i = ls.indexOf(document.activeElement);
    e.preventDefault(); ls[i < 0 ? (k > 0 ? 0 : ls.length - 1) : (i + k + ls.length) % ls.length].focus();
  }, { signal });
  show(cur);
}

/* Искра выбранной точки (из макета карты мира). */
const SPARK = '<svg class="spark" viewBox="-100 -100 200 200" aria-hidden="true"><defs><radialGradient id="sb"><stop offset="0" stop-color="#FFF3C8" stop-opacity=".95"/><stop offset=".25" stop-color="#FFD36E" stop-opacity=".6"/><stop offset=".6" stop-color="#F2A93B" stop-opacity=".18"/><stop offset="1" stop-color="#F2A93B" stop-opacity="0"/></radialGradient><radialGradient id="sd"><stop offset="0" stop-color="#8A5A1A"/><stop offset=".7" stop-color="#4A2E0C"/><stop offset="1" stop-color="#2A1804"/></radialGradient><linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#FFE9A8" stop-opacity="0"/><stop offset=".42" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset=".5" stop-color="#fff"/><stop offset=".58" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></linearGradient><linearGradient id="sv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8" stop-opacity="0"/><stop offset=".42" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset=".5" stop-color="#fff"/><stop offset=".58" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></linearGradient><filter id="sg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2"/></filter></defs><circle class="halo" r="78" fill="url(#sb)"/><g class="r1"><circle r="94" fill="none" stroke="#FFD36E" stroke-width="3" opacity=".35" filter="url(#sg)"/><circle r="94" fill="none" stroke="#FFDD8A" stroke-width="1.1" opacity=".85"/></g><g class="r2"><circle r="62" fill="none" stroke="#FFD36E" stroke-width="3" opacity=".35" filter="url(#sg)"/><circle r="62" fill="none" stroke="#FFDD8A" stroke-width="1.1" opacity=".85"/></g><g class="flare"><path d="M-100 0Q0 -3.6 100 0Q0 3.6 -100 0Z" fill="url(#sh)"/><path d="M-46 -46L0 -1.4 46 46 0 1.4Z" fill="#FFE9A8" opacity=".18"/><path d="M46 -46L1.4 0 -46 46 -1.4 0Z" fill="#FFE9A8" opacity=".18"/></g><g class="star"><path d="M0 -66Q2.6 -2.6 66 0Q2.6 2.6 0 66Q-2.6 2.6 -66 0Q-2.6 -2.6 0 -66Z" fill="#FFE39A" opacity=".5" filter="url(#sg)"/><path d="M0 -64Q3.4 -3.4 0 -3.4Q-3.4 -3.4 0 -64Z M0 64Q3.4 3.4 0 3.4Q-3.4 3.4 0 64Z" fill="url(#sv)"/><circle r="16" fill="none" stroke="#FFD060" stroke-width="10" opacity=".85" filter="url(#sg)"/><circle r="15" fill="url(#sd)" stroke="#FFD36E" stroke-width="3.6"/><circle r="15" fill="none" stroke="#FFF3C8" stroke-width=".8" opacity=".8"/><path d="M0 -11Q1.1 -1.1 11 0Q1.1 1.1 0 11Q-1.1 1.1 -11 0Q-1.1 -1.1 0 -11Z" fill="#FFF8E0"/><circle r="3.2" fill="#fff"/></g></svg>';
