import { t, mark } from '../kit.js';
export default function compare(w, c) {
  const col = (x) => '<div class="paper"><h3>' + x.title + '</h3>' + x.rows.map((r, i) => '<div class="r' + (i === w.diff ? ' diff' : '') + '"><span>' + r[0] + '</span>' + r[1] + '</div>').join('') + '</div>';
  c.body.insertAdjacentHTML('beforeend', '<div class="cmp" data-r="cmp">' + col(w.a) + col(w.b) + '</div><div data-r="rs" aria-live="polite"></div><span class="stampm">' + mark(w.mark) + '</span>' + (w.markText ? '<p class="intro">' + w.markText + '</p>' : ''));
  c.foot.innerHTML = '<span></span><button class="btnp" data-r="go">' + t('ui.overlay') + '</button>';
  const go = c.root.querySelector('[data-r="go"]'); let on = false;
  go.addEventListener('click', () => {
    on = !on;
    c.root.querySelector('[data-r="cmp"]').classList.toggle('over', on);
    go.textContent = on ? t('ui.overlayOff') : t('ui.overlay');
    c.root.querySelector('[data-r="rs"]').innerHTML = on ? '<p class="result bad">' + w.note + '</p>' : '';
    if (on) c.done({ ok: true, value: null });
  });
}
