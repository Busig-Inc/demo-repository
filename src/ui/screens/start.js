/* Старт: логотип, «Начать» или «Продолжить», справка и быстрый показ маршрутов для преподавателя. */
import { t, ic } from '../kit.js';
import { useStyles } from '../styles.js';
import MISSION from '../../content/missions/insulin/index.js';

export function renderStart(root, { store, go, signal }) {
  useStyles('start');
  const started = store.get().journal.length > 0;
  const notice = store.wasReset ? '<p class="notice" role="status">' + t('save.reset') + '</p>' : '';
  root.innerHTML = '<div class="viewport"><div class="stage" id="stage"><main class="start">'
    + '<img src="logo/logo-stacked.svg" alt="' + t('app.name') + '">'
    + '<p>' + t('app.tagline') + '</p>' + notice
    + '<div class="btns">'
    + (started
      ? '<button class="btn primary" data-r="continue"><span>' + t('save.continue') + '</span>' + ic('next') + '</button><button class="btn second" data-r="restart">' + t('save.restart') + '</button>'
      : '<button class="btn primary" data-r="begin"><span>' + t('start.begin') + '</span>' + ic('next') + '</button>')
    + '<button class="btn second" data-r="help" aria-expanded="false">' + ic('help') + '<span>' + t('nav.help') + '</span></button></div>'
    + '<div class="start-help" data-r="helptext" hidden>' + [1, 2, 3, 4].map((i) => '<p>' + t('help.p' + i) + '</p>').join('') + '</div>'
    + '<button class="demo-link" data-r="demo" aria-expanded="false">' + t('demo.link') + '</button>'
    + '<div class="demo" data-r="demopanel" hidden><b>' + t('demo.title') + '</b><p>' + t('demo.text') + '</p>'
    + ['H', 'L', 'N'].map((r) => '<button class="demo-route" data-route="' + r + '"><span class="code">' + r + '</span><span>' + t('demo.' + r) + '</span>' + ic('next', 20) + '</button>').join('')
    + '</div>'
    + '<small>' + t('app.desktopOnly') + '</small></main></div></div>';

  const $ = (r) => root.querySelector('[data-r="' + r + '"]');
  const toggle = (btn, panel) => { const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', open); };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const r = b.dataset.r;
    if (r === 'begin') go('world');
    else if (r === 'continue') { const at = store.get().at; go(at && at !== 'start' ? at : 'world'); }
    else if (r === 'restart') { if (confirm(t('save.restartConfirm'))) { store.reset(); go('world'); } }
    else if (r === 'help') toggle(b, $('helptext'));
    else if (r === 'demo') toggle(b, $('demopanel'));
    else if (b.dataset.route) { store.replace(MISSION.presetBeforeCouncil(b.dataset.route)); go('council'); }
  }, { signal });
}
