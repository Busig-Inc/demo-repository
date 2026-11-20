/* Записная книжка: живые записи героя по состоянию игры + короткая справка «как играть». */
import { t, esc } from '../kit.js';
import { ledger } from '../../engine/rules.js';
import { notebook as build } from '../../content/missions/insulin/notebook.js';

export default function notebook(w, c) {
  const s = c.state;
  const parts = build(s, ledger(s));
  const html = parts.map((p) => '<h3 class="nb-h">' + esc(p.h) + '</h3>' + p.lines.map((x) => '<p>' + esc(x) + '</p>').join('')).join('');
  const howto = '<h3 class="nb-h">' + t('help.title') + '</h3>' + [1, 2, 3, 4].map((i) => '<p class="nb-how">' + t('help.p' + i) + '</p>').join('');
  c.body.insertAdjacentHTML('beforeend', '<div class="paper notebook">' + html + howto + '</div>');
  c.foot.innerHTML = '';
}
