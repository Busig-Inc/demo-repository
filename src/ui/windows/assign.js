import { t, esc } from '../kit.js';
/* Расходы по работам и источникам. outcome.value — {номер работы: ключ источника}. */
export default function assign(w, c) {
  const a = {};
  const cap = w.sources.find((s) => s.cap != null && s.k !== 'none') || {};
  c.body.insertAdjacentHTML('beforeend', '<p class="intro">' + w.intro + '</p><div data-r="rows">'
    + w.works.map((x, i) => '<div class="arow2"><div class="nm"><span>' + esc(x.n) + '</span><em>' + x.c + ' ' + t('ui.units') + '</em></div><div class="seg" role="radiogroup" data-i="' + i + '">'
      + w.sources.map((s) => '<button class="' + (s.bad ? 'bad' : '') + '" role="radio" aria-checked="false" data-k="' + s.k + '">' + s.t + '</button>').join('') + '</div></div>').join('')
    + '</div><div class="tally" data-r="ty"></div><div data-r="rs" aria-live="polite"></div>');
  c.foot.innerHTML = '<span></span><button class="btnp" data-r="go" disabled>' + t('ui.confirm') + '</button>';
  const $ = (r) => c.root.querySelector('[data-r="' + r + '"]');
  const upd = () => {
    const used = {}; let bad = '';
    w.works.forEach((x, i) => { const k = a[i]; if (!k) return; used[k] = (used[k] || 0) + x.c; const s = w.sources.find((z) => z.k === k); if (s.bad) bad = s.bad; });
    const need = used[cap.k] || 0; const over = need > (cap.cap || 0);
    $('ty').innerHTML = '<div class="r"><span>' + t('ui.needTotal') + ' (' + (cap.t || '') + ')</span><b>' + need + ' / ' + (cap.cap || 0) + '</b></div>'
      + (over ? '<div class="r gap"><span>' + t('ui.gap') + '</span><b>' + (need - cap.cap) + '</b></div>' : '')
      + (bad ? '<div class="r gap"><span>' + bad + '</span></div>' : '')
      + (over && w.strict ? '<div class="r gap"><span>' + t('ui.overCap') + '</span></div>' : '');
    $('go').disabled = !Object.keys(a).length || !!bad || (over && !!w.strict);
  };
  $('rows').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const i = +b.parentNode.dataset.i; a[i] = b.dataset.k;
    b.parentNode.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', x === b)); upd();
  });
  $('go').addEventListener('click', () => {
    const outcome = { ok: true, value: { ...a } };
    $('rs').innerHTML = '<p class="result">' + (c.msg(outcome) || w.result) + '</p>';
    c.done(outcome);
  });
  upd();
}
