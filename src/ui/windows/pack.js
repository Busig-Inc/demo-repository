import { t, ic, units, esc } from '../kit.js';
/* Собрать запрос или отправление из карточек. outcome.value — номера выбранных карточек. */
export default function pack(w, c) {
  const sel = new Set();
  c.body.insertAdjacentHTML('beforeend', (w.intro ? '<p class="intro">' + w.intro + '</p>' : '')
    + '<div class="pack">' + w.items.map((it, i) => '<button class="pk" role="checkbox" aria-checked="false" data-i="' + i + '"><span class="ck">' + ic('done', 16) + '</span><span><b>' + esc(it.t) + '</b><small>' + esc(it.h) + '</small></span><span class="units">' + units(it.c) + '</span></button>').join('') + '</div>'
    + '<div class="pack-sum" data-r="sum"></div><div data-r="rs" aria-live="polite"></div>');
  c.foot.innerHTML = '<span></span><button class="btnp" data-r="go" disabled>' + w.confirm + '</button>';
  const $ = (r) => c.root.querySelector('[data-r="' + r + '"]');
  const upd = () => {
    const tot = [...sel].reduce((a, i) => a + w.items[i].c, 0);
    const miss = w.warn && sel.has(0) && w.must.some((i) => i !== 0 && !sel.has(i));
    $('sum').innerHTML = '<div class="row">' + t('s1.sumAsk') + '<i></i><em>' + (sel.size ? [...sel].sort().map((i) => w.items[i].t).join(', ') : t('s1.sumNothing')) + '</em></div>'
      + (tot ? '<div class="row">' + t('ui.total') + '<i></i><em>' + tot + ' ' + t('ui.units') + '</em></div>' : '')
      + (miss ? '<div class="warn">' + ic('risk', 16) + w.warn + '</div>' : '');
    $('go').disabled = !sel.size;
  };
  c.body.querySelector('.pack').addEventListener('click', (e) => {
    const b = e.target.closest('.pk'); if (!b) return;
    const i = +b.dataset.i; sel.has(i) ? sel.delete(i) : sel.add(i);
    b.setAttribute('aria-checked', sel.has(i)); upd();
  });
  $('go').addEventListener('click', () => {
    const value = [...sel].sort((a, b) => a - b);
    const ok = w.must.every((i) => sel.has(i)) && !w.items.some((it, i) => it.avoid && sel.has(i));
    const outcome = { ok, value };
    const custom = c.msg(outcome);
    $('rs').innerHTML = '<p class="result' + (ok ? '' : ' bad') + '">' + (custom || (ok ? w.okMsg : w.partMsg)) + '</p>';
    c.done(outcome);
  });
  upd();
}
