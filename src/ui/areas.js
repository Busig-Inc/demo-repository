/* Три постоянные области: папка, смета, календарь. Всё считается из состояния и сметы движка. */
import { t, ic, plural, esc } from './kit.js';
import { ledger } from '../engine/rules.js';
import MISSION from '../content/missions/insulin/index.js';

const RESEARCH = 'Исследование Маклеода';

export function calendarFor(s, planOverride) {
  const p = planOverride || s.plan;
  const plan = p && MISSION.plans[p];
  if (!plan) return s.researchPlaced ? [[RESEARCH, 1, 3, 'plan', 1]] : [];
  const signed = !!s.plan;
  const rows = plan.cal.map((r) => [...r]);
  for (const r of rows) {
    if (r[0] === RESEARCH && signed) r[3] = s.s9 === 'research' || (s.plan === 'W' && s.wAlloc?.research) ? 'paid' : s.s9 ? 'late' : 'plan';
    if (r[0] === 'Повторная проверка Lilly' && s.s8.cycle) r[3] = 'paid';
    if (s.plan === 'W' && signed) {
      const k = { 'Сохранение группы': 'group', 'Передача метода': 'method' }[r[0]];
      if (k && !s.wAlloc?.[k]) r[3] = 'late';
    }
  }
  if (s.plan === 'L' && s.s8.cycle) rows.push(['Повторная проверка', 7, 8, s.s9 === 'control' ? 'paid' : s.s9 ? 'late' : 'plan', 1]);
  return rows;
}

function calendarHTML(works, weeks = 8) {
  const st = { paid: t('cal.paid'), plan: t('cal.plan'), wait: t('cal.wait'), late: t('cal.late') };
  if (!works.length) return '<p class="empty">' + t('cal.empty') + '</p>';
  return '<div class="cal" style="--wk:' + weeks + '"><div class="cal-h"><span>' + t('cal.work') + '</span>'
    + Array.from({ length: weeks }, (_, i) => '<span>' + t('cal.week') + ' ' + (i + 1) + '</span>').join('') + '</div>'
    + works.map((w) => '<div class="cal-r"><b>' + esc(w[0]) + '</b><div class="wk ' + w[3] + '" style="grid-column:' + (w[1] + 1) + '/' + (Math.min(w[2], weeks + 1) + 1) + '" title="' + st[w[3]] + '">' + (w[2] - w[1] > 1 ? st[w[3]] : '') + '<span>' + w[4] + '</span></div></div>').join('')
    + '</div>';
}

function budgetHTML(s) {
  const l = ledger(s);
  const plan = !!s.plan;
  const pend = (on) => (on ? ' <span class="st">' + t('budget.pending') + '</span>' : '');
  const row = (n, key, hint, pending) => '<div class="brow' + (n ? '' : ' zero') + '"><span class="num">' + n + '</span><span><b>' + t('budget.' + key) + pend(pending) + '</b><small>' + t('budget.' + hint) + '</small></span></div>';
  const free = row(l.free.left, 'free', plan ? 'freeHintPlan' : 'freeHint');
  const unused = l.target.status === 'unused';
  const target = unused
    ? '<div class="brow zero"><span class="num">0</span><span><b>' + t('budget.target') + '</b><small>Дар не использован: выбранный план не покупает аппарат, дарителю сообщили об отказе.</small></span></div>'
    : row(l.target.total - l.target.spent, 'target', l.target.total ? 'targetHintPlan' : 'targetHint', l.target.status === 'pending');
  const kind = row(l.kind.total - l.kind.used, 'kind', l.kind.total || s.offers.exchange === 'narrow' ? 'kindHintPlan' : 'kindHint', !plan && s.offers.exchange === 'narrow');
  const spent = l.free.spent.length
    ? '<div class="bneed"><span class="lbl">Оплачено из свободных</span>' + l.free.spent.map((x) => '<div class="r">' + workName(x.work) + '<i></i><em>' + x.cost + '</em></div>').join('') + '</div>'
    : '';
  const need = !plan
    ? '<div class="bneed"><span class="lbl">' + t('budget.need') + '</span>' + [1, 2, 3, 4].map((i, k) => '<div class="r">' + t('budget.need' + i) + '<i></i><em>' + [4, 1, 1, 1][k] + '</em></div>').join('') + '</div><div class="bsum"><span>' + t('budget.needTotal') + '</span><span class="gap">' + t('budget.gap') + '</span></div>'
    : '<div class="bsum"><span>' + t('s7.nocomment') + '</span></div>';
  return '<div class="budget"><div class="bhelp">' + t('budget.help') + '</div>' + free + target + kind + spent + need + '</div>';
}

const WORKS = { setup: 'Освоение', firstCheck: 'Первая проверка', control: 'Повторная проверка', research: RESEARCH, kitting: 'Сборка, без возврата', group: 'Сохранение группы', method: 'Передача метода', purchaseRest: 'Остаток покупки' };
export const workName = (k) => WORKS[k] || k;

function folderHTML(s) {
  const docs = s.folder.map((id) => MISSION.docs[id]).filter(Boolean);
  if (!docs.length) return '<p class="empty">Папка пока пуста. Документы появятся, когда вы их получите.</p>';
  return '<div class="folder">' + docs.map((d) => '<div class="fdoc' + (d.mark === 'archive' ? ' hist' : '') + '">' + ic('document') + '<span><b>' + esc(d.t) + '</b><small>' + esc(d.h) + '</small></span><span class="src">' + (d.mark === 'archive' ? ic('license', 16) + t('folder.archive') : t('folder.game')) + '</span></div>').join('') + '</div>';
}

/* Кнопки трёх областей для шапки. */
export function areasHTML(s, planOverride) {
  const l = ledger(s);
  const cal = calendarFor(s, planOverride);
  return '<div class="areas" id="areas" aria-label="' + t('areas.hint') + '">'
    + '<button data-a="folder" aria-expanded="false">' + ic('dossier') + '<span class="n"><span class="lbl">' + t('areas.folder') + '</span><span class="v">' + s.folder.length + '</span></span></button>'
    + '<button data-a="budget" aria-expanded="false">' + ic('budget') + '<span class="n"><span class="lbl">' + t('areas.budget') + '</span><span class="v">' + l.free.left + ' ' + t('ui.units') + '</span></span></button>'
    + '<button data-a="cal" aria-expanded="false">' + ic('date') + '<span class="n"><span class="lbl">' + t('areas.calendar') + '</span><span class="v">' + (cal.length ? plural(cal.length, 'areas.worksForms') : '0') + '</span></span></button></div>';
}

export function popupHTML(kind, s, planOverride) {
  if (kind === 'folder') return '<div class="ph"><span class="lbl lamp">' + t('folder.title') + '</span></div>' + folderHTML(s);
  if (kind === 'budget') return '<div class="ph"><span class="lbl lamp">' + t('budget.title') + '</span></div>' + budgetHTML(s);
  return '<div class="ph"><span class="lbl lamp">' + t('cal.title') + '</span></div>' + calendarHTML(calendarFor(s, planOverride));
}

/* Подключить кнопки областей к всплывающей панели. getPlan — выбранный, но не подписанный план (совет). */
export function wireAreas(root, pop, store, { signal, getPlan = () => null, onOpen = () => {} } = {}) {
  const buttons = () => [...root.querySelectorAll('#areas button')];
  const close = () => { pop.hidden = true; buttons().forEach((b) => b.setAttribute('aria-expanded', 'false')); };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('#areas button');
    if (!b) return;
    const open = b.getAttribute('aria-expanded') === 'true';
    close();
    if (open) return;
    onOpen();
    b.setAttribute('aria-expanded', 'true');
    pop.innerHTML = popupHTML(b.dataset.a, store.get(), getPlan());
    pop.hidden = false;
  }, { signal });
  return close;
}
