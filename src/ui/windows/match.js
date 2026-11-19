import { t, mark, esc } from '../kit.js';
export default function match(w, c) {
  c.body.insertAdjacentHTML('beforeend', '<p class="intro">' + w.intro + '</p>'
    + w.rows.map((r, i) => '<div class="arow2"><div class="nm"><label for="m' + i + '">' + esc(r.n) + '</label></div><select class="sel" id="m' + i + '" data-i="' + i + '"><option value="">' + t('ui.pickOne') + '</option>' + r.opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('') + '</select></div>').join('')
    + '<div data-r="rs" aria-live="polite"></div><span class="stampm">' + mark(w.mark) + '</span>');
  c.foot.innerHTML = '<span></span><button class="btnp" data-r="go">' + t('ui.check') + '</button>';
  c.root.querySelector('[data-r="go"]').addEventListener('click', () => {
    const ok = w.rows.every((r, i) => c.body.querySelector('select[data-i="' + i + '"]').value === String(r.ok));
    c.root.querySelector('[data-r="rs"]').innerHTML = '<p class="result' + (ok ? '' : ' bad') + '">' + (ok ? w.done : t('ui.matchBad')) + '</p>';
    if (ok) c.done({ ok: true, value: null });
  });
}
