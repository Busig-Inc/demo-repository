import { mark } from '../kit.js';
export default function doc(w, c) {
  c.body.insertAdjacentHTML('beforeend', '<div class="paper">' + w.paras.map((p) => '<p>' + p + '</p>').join('') + '<span class="stampm">' + mark(w.mark) + '</span></div>');
  c.done({ ok: true, value: null });
}
