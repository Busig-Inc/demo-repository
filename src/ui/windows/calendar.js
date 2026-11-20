import { t, esc } from '../kit.js';
export default function calendar(w, c) {
  const st = { paid: t('cal.paid'), plan: t('cal.plan'), wait: t('cal.wait'), late: t('cal.late') };
  const weeks = w.weeks || 6;
  c.body.insertAdjacentHTML('beforeend', '<div class="cal" style="--wk:' + weeks + '"><div class="cal-h"><span>' + t('cal.work') + '</span>'
    + Array.from({ length: weeks }, (_, i) => '<span>' + t('cal.week') + ' ' + (i + 1) + '</span>').join('') + '</div>'
    + w.works.map((x) => '<div class="cal-r"><b>' + esc(x[0]) + '</b><div class="wk ' + x[3] + '" style="grid-column:' + (x[1] + 1) + '/' + (Math.min(x[2], weeks + 1) + 1) + '" title="' + st[x[3]] + '">' + (x[2] - x[1] > 1 ? st[x[3]] : '') + '<span>' + x[4] + '</span></div></div>').join('')
    + '</div><p class="intro">' + (w.note || '') + '</p>');
  c.done({ ok: true, value: null });
}
