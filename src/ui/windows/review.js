/* Окна финала и личного разбора S11. Всё строится движком разбора по состоянию игрока. */
import { t, ic, mark, esc } from '../kit.js';
import { pathSteps, opportunityMap, causeChains, alternatives, counterfactual, restoreFrom } from '../../engine/review.js';
import { resolveFinal } from '../../engine/rules.js';
import MISSION from '../../content/missions/insulin/index.js';

const C = MISSION.review;
const ok = { ok: true, value: null };

export function final(w, c) {
  c.body.insertAdjacentHTML('beforeend', '<div class="frows">' + w.rows.map((r) => '<div class="r"><span>' + r[0] + '</span><div>' + r[1] + '</div></div>').join('') + '</div><p class="result">' + w.reflect + '</p>');
  c.done(ok);
}

export function timeline(w, c) {
  const s = c.state;
  const steps = pathSteps(s, C);
  const seen = s.costsSeenAt === 'S1' ? 'Расходы после покупки вы заметили в лаборатории, до разговора с донором.' : 'Расходы после покупки вы заметили только в совете.';
  c.body.insertAdjacentHTML('beforeend', '<p class="intro">' + seen + '</p><ol class="steps">' + steps.map((x) => '<li class="step2"><span class="c">' + (C.scenePlace[x.scene] || x.scene) + '</span><div><b>' + esc(x.title) + '</b><p>' + esc(x.text) + '</p></div></li>').join('') + '</ol>'
    + (s.original ? '<p class="intro">' + t('review.replayBanner') + ' Первое прохождение закончилось финалом <b>' + esc(MISSION.finals[s.original.final].title) + '</b>.</p>' : ''));
  c.done(ok);
}

export function opportunities(w, c) {
  const map = opportunityMap(c.state, C);
  const order = ['used', 'declined', 'seen', 'missed'];
  c.body.insertAdjacentHTML('beforeend', '<p class="intro">Какие возможности миссии вы использовали, какие заметили и отклонили, а какие не нашли. Оценок здесь нет: важна причина.</p>'
    + '<div class="opps">' + order.map((st) => {
      const items = map.filter((o) => o.status === st);
      if (!items.length) return '';
      return '<section class="opp-group ' + st + '"><h3>' + t('review.status.' + st) + '</h3>' + items.map((o) => '<div class="opp"><b>' + esc(o.title) + '</b><p>' + esc(o.note) + '</p></div>').join('') + '</section>';
    }).join('') + '</div>');
  c.done(ok);
}

export function causes(w, c) {
  const list = causeChains(c.state, C);
  c.body.insertAdjacentHTML('beforeend', '<p class="intro">Каждое последствие объясняется условием, которое было видно до решения.</p>'
    + list.map((x) => '<div class="chain"><span class="c">' + C.scenePlace[x.id.replace(/[LH]$/, '')] + '</span><dl>'
      + '<dt>' + t('review.known') + '</dt><dd>' + esc(x.known) + '</dd><dt>' + t('review.action') + '</dt><dd>' + esc(x.action) + '</dd>'
      + '<dt>' + t('review.outcome') + '</dt><dd>' + esc(x.outcome) + '</dd><dt>' + t('review.basis') + '</dt><dd>' + esc(x.basis) + '</dd></dl></div>').join(''));
  c.done(ok);
}

export function facts(w, c) {
  c.body.insertAdjacentHTML('beforeend', '<div class="frows facts">' + C.facts.map(([d, txt, url]) => '<div class="r"><span>' + d + '</span><div>' + txt + ' <a href="' + url + '" target="_blank" rel="noopener">' + t('review.source') + '</a></div></div>').join('') + '</div>'
    + '<span class="stampm">' + mark('archive') + '</span><p class="intro">' + C.compareNote + '</p>');
  c.done(ok);
}

export function counterfactualWin(w, c) {
  const s = c.state;
  const alts = alternatives(s);
  if (!alts.length) { c.body.insertAdjacentHTML('beforeend', '<p class="intro">' + t('review.altNone') + '</p>'); c.done(ok); return; }
  c.body.insertAdjacentHTML('beforeend', '<p class="intro">' + t('review.altIntro') + '</p><div class="pack" role="radiogroup">'
    + alts.map((a) => '<button class="pk" role="radio" aria-checked="false" data-alt="' + a.id + '"><span class="ck">' + ic('done', 16) + '</span><span><b>' + C.altLabels[a.id] + '</b></span><span></span></button>').join('')
    + '</div><div data-r="cmp" aria-live="polite"></div>');
  c.foot.innerHTML = '';
  let chosen = null;
  const fin = (code) => MISSION.finals[code].title;
  c.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-alt]');
    if (!b) return;
    chosen = b.dataset.alt;
    c.body.querySelectorAll('[data-alt]').forEach((x) => x.setAttribute('aria-checked', x === b));
    const cf = counterfactual(s, chosen, C);
    c.root.querySelector('[data-r="cmp"]').innerHTML = '<div class="cf"><div class="cf-h"><span></span><b>' + t('review.altWas') + '</b><b>' + t('review.altNow') + '</b></div>'
      + '<div class="cf-r final"><span>Финал</span><div>' + fin(resolveFinal(s)) + '</div><div>' + fin(cf.final) + '</div></div>'
      + cf.diff.map((d) => '<div class="cf-r' + (d.changed ? ' changed' : '') + '"><span>' + d.row + '</span><div>' + esc(d.was) + '</div><div>' + esc(d.now) + '</div></div>').join('') + '</div>';
    c.foot.innerHTML = '<span class="intro">Исходная карта сохранится в разборе.</span><button class="btnp" data-r="replay">' + t('review.altReplay') + '</button>';
    c.done({ ok: true, value: chosen });
  });
  c.foot.addEventListener('click', (e) => {
    if (!e.target.closest('[data-r="replay"]') || !chosen) return;
    c.store.replace(restoreFrom(s, chosen));
    c.go(chosen.startsWith('s9:') ? 'scene/s9' : 'council');
  });
}

export function note(w, c) {
  const saved = c.state.note || [];
  c.body.insertAdjacentHTML('beforeend', '<p class="intro">Короткая записка о вашей организации. Она сохраняется в браузере, её можно скачать.</p>'
    + C.fields.map(([label, ph], i) => '<div class="field"><label for="nf' + i + '">' + label + '</label><input id="nf' + i + '" type="text" placeholder="' + esc(ph) + '" value="' + esc(saved[i] || '') + '"></div>').join('')
    + '<div data-r="rs" aria-live="polite"></div>');
  c.foot.innerHTML = '<button class="btns2" data-r="dl">' + t('review.noteDownload') + '</button><button class="btnp" data-r="sv">' + t('ui.save') + '</button>';
  const values = () => [...c.body.querySelectorAll('input')].map((i) => i.value.trim());
  c.foot.addEventListener('click', (e) => {
    const r = e.target.closest('[data-r]')?.dataset.r;
    const v = values();
    if (r === 'sv') {
      const thin = v.some((x) => /^найти финансирование\.?$/i.test(x));
      const empty = v.filter(Boolean).length < 3;
      const msg = thin ? t('review.noteThin') : empty ? 'Заполните хотя бы работу, первый уязвимый расход и адресата.' : t('ui.noteSaved').replace(' (образец)', '');
      c.root.querySelector('[data-r="rs"]').innerHTML = '<p class="result' + (thin || empty ? ' bad' : '') + '">' + msg + '</p>';
      if (!thin && !empty) c.done({ ok: true, value: v });
    }
    if (r === 'dl') {
      const text = 'Записка о своей организации\nМиссия «Инсулин»\n\n' + C.fields.map(([l], i) => l + ': ' + (v[i] || '—')).join('\n') + '\n';
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), download: 'записка-инсулин.txt' });
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });
}
