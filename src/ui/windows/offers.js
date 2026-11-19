import { t, units, mark, esc } from '../kit.js';
/* Карточки предложений с решениями. outcome.value — {card, decision}. */
export default function offers(w, c) {
  const kn = { target: t('ui.kindTarget'), kind: t('ui.kindKind'), promise: t('ui.kindPromise') };
  c.body.insertAdjacentHTML('beforeend', w.cards.map((o, i) => '<div class="offer' + (o.kind === 'promise' ? ' pending' : ' ok') + '" data-i="' + i + '">'
    + '<div class="from"><b>' + esc(o.from) + '</b><span class="lbl">' + esc(o.role) + '</span></div>'
    + '<dl><dt>' + t('ui.units') + '</dt><dd><span class="units">' + units(Math.min(o.units, 8), 'w') + '</span>' + o.units + ' ' + kn[o.kind] + '</dd><dt>На что</dt><dd>' + o.purpose + '</dd><dt>Срок</dt><dd>' + o.term + '</dd></dl>'
    + '<p class="intro">' + o.note + '</p>'
    + (o.next ? '<p class="nextv">' + t('plan.nextVersion') + '</p>' : '')
    + '<div class="decs">' + o.decisions.map((d, j) => '<button class="btns2" data-d="' + j + '">' + d.t + '</button>').join(' ') + '</div><div class="res" aria-live="polite"></div></div>').join('')
    + '<span class="stampm">' + mark(w.mark) + '</span>' + (w.markText ? '<p class="intro">' + w.markText + '</p>' : ''));
  c.foot.innerHTML = '';
  c.body.addEventListener('click', (e) => {
    const b = e.target.closest('.btns2'); if (!b) return;
    const card = b.closest('.offer'); const i = +card.dataset.i; const j = +b.dataset.d;
    card.querySelectorAll('.btns2').forEach((x) => x.setAttribute('aria-pressed', x === b));
    card.querySelector('.res').innerHTML = '<p class="result">' + w.cards[i].decisions[j].res + '</p>';
    c.done({ ok: true, value: { card: i, decision: j } });
  });
}
