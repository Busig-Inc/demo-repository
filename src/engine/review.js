/* Движок личного разбора S11. Всё строится по журналу и состоянию игрока.
   Тексты возможностей, цепочек и строк сравнения лежат в данных миссии (content). */
import { apply } from './state.js';
import { ledger, resolveFinal, planAvailability } from './rules.js';

const val = (x, ...args) => (typeof x === 'function' ? x(...args) : x);

export function pathSteps(s, c) {
  const out = [];
  for (const e of s.journal) {
    const f = c.pathText[e.type];
    const r = f && f(e, s);
    if (r) out.push({ scene: c.sceneCode[e.scene] || String(e.scene).toUpperCase(), title: r.title, text: r.text });
  }
  return out;
}

export function opportunityMap(s, c) {
  const l = ledger(s);
  return c.opportunities.map((o) => ({ id: o.id, title: o.title, ...o.eval(s, l) }));
}

export function causeChains(s, c, max = 4) {
  const l = ledger(s);
  const picked = c.causes
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => x.when(s, l))
    .sort((a, b) => a.x.prio - b.x.prio)
    .slice(0, max)
    .sort((a, b) => a.i - b.i);
  return picked.map(({ x }) => ({
    id: x.id, known: val(x.known, s, l), action: val(x.action, s, l), outcome: val(x.outcome, s, l), basis: val(x.basis, s, l),
  }));
}

const S9_OPTIONS = { L: ['control', 'research', 'reserve'], H: ['research', 'reserve'] };

export function alternatives(s) {
  const before = s.snapshots.beforeSign;
  if (!before) return [];
  const open = planAvailability(before);
  const out = [];
  for (const p of ['L', 'H', 'N', 'W']) if (p !== s.plan && open[p].open) out.push({ id: 'plan:' + p });
  if (s.s9 && S9_OPTIONS[s.plan]) for (const ch of S9_OPTIONS[s.plan]) if (ch !== s.s9) out.push({ id: 's9:' + ch });
  return out;
}

/* Достроить маршрут после подписи так, как его прошёл бы игрок. */
function completeRoute(s, s9pref) {
  if (s.plan === 'N') return apply(s, { type: 's8n', step: 'done' });
  if (s.plan === 'W') return s;
  const t = apply(s, [{ type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }]);
  return apply(t, { type: 's9', choice: s9pref });
}

function altState(s, altId) {
  const [kind, value] = altId.split(':');
  if (kind === 's9') {
    if (!s.snapshots.beforeS9) throw new Error('Нет снапшота перед S9');
    return apply(s.snapshots.beforeS9, { type: 's9', choice: value });
  }
  if (!s.snapshots.beforeSign) throw new Error('Нет снапшота перед подписью');
  let t = s.snapshots.beforeSign;
  if (value === 'N' && !t.riskApproved) t = apply(t, { type: 'risk' });
  t = apply(t, value === 'W'
    ? { type: 'sign', plan: 'W', wAlloc: { group: true, method: true, research: true } }
    : { type: 'sign', plan: value });
  // L сохраняет цель исходного прохождения: подтвердить этап, то есть оплатить контроль.
  // H сохраняет прежнее назначение последней единицы, если оно допустимо.
  const pref = value === 'L' ? 'control' : S9_OPTIONS.H.includes(s.s9) ? s.s9 : 'research';
  return completeRoute(t, pref);
}

export function counterfactual(s, altId, c) {
  const alt = altState(s, altId);
  const was = c.facets(s, ledger(s));
  const now = c.facets(alt, ledger(alt));
  return {
    state: alt,
    final: resolveFinal(alt),
    ledger: ledger(alt),
    diff: was.map(([row, w], i) => ({ row, was: w, now: now[i][1], changed: w !== now[i][1] })),
  };
}

export function restoreFrom(s, altId) {
  const isS9 = altId.startsWith('s9:');
  const base = isS9 ? s.snapshots.beforeS9 : s.snapshots.beforeSign;
  const r = structuredClone(base);
  r.snapshots = isS9 ? { beforeSign: structuredClone(s.snapshots.beforeSign) } : {};
  r.at = isS9 ? 'scene/s9' : 'council';
  if (isS9) delete r.acts?.['s9.last']; // снимок сделан в одной пачке с отметкой действия
  else r.demo = altId.slice(5);         // совет сразу предлагает выбранный план
  r.replayOf = altId;
  r.original = { journal: structuredClone(s.journal), plan: s.plan, s9: s.s9, final: resolveFinal(s) };
  return r;
}
