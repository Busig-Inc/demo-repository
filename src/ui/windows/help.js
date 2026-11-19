import { t } from '../kit.js';
export default function help(w, c) {
  c.body.insertAdjacentHTML('beforeend', '<div class="paper">' + [1, 2, 3, 4].map((i) => '<p>' + t('help.p' + i) + '</p>').join('') + '</div>');
  c.foot.innerHTML = '';
}
