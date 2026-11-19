import { ic, esc } from '../kit.js';
/* Выбрать один вариант. outcome.value — option.value, если задано, иначе номер варианта. */
export default function choice(w, c) {
  let cur = -1;
  c.body.insertAdjacentHTML('beforeend', (w.intro ? '<p class="intro">' + w.intro + '</p>' : '')
    + '<div class="pack" role="radiogroup">' + w.options.map((o, i) => '<button class="pk" role="radio" aria-checked="false" data-i="' + i + '"><span class="ck">' + ic('done', 16) + '</span><span><b>' + esc(o.t) + '</b><small>' + esc(o.h) + '</small></span><span></span></button>').join('') + '</div><div data-r="rs" aria-live="polite"></div>');
  c.foot.innerHTML = '<span></span><button class="btnp" data-r="go" disabled>' + w.confirm + '</button>';
  const go = c.root.querySelector('[data-r="go"]');
  c.body.querySelector('.pack').addEventListener('click', (e) => {
    const b = e.target.closest('.pk'); if (!b) return;
    cur = +b.dataset.i;
    c.body.querySelectorAll('.pk').forEach((x) => x.setAttribute('aria-checked', x === b));
    go.disabled = false;
  });
  go.addEventListener('click', () => {
    const o = w.options[cur];
    c.root.querySelector('[data-r="rs"]').innerHTML = '<p class="result' + (o.good ? '' : ' bad') + '">' + o.fb + '</p>';
    if (w.once) { go.disabled = true; c.body.querySelectorAll('.pk').forEach((x) => { x.disabled = true; }); }
    c.done({ ok: !!o.good, value: o.value ?? cur });
  });
}
