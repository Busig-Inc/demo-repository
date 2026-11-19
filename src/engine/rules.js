/* Правила миссии: какие планы открыты, сколько потрачено, какой финал наступил, куда можно перейти.
   Числа из сценария, раздел «Как устроены расчёты». */
import { setSignGuard } from './state.js';

export const FREE_TOTAL = 3;
export const GIFT_UNITS = 4;
export const PLANS = ['L', 'H', 'P', 'W', 'N', 'F'];
export const NEXT_VERSION = ['P', 'F'];
const PRE_COUNCIL = ['s0', 's1', 's2', 's3', 's4', 's5', 's5m', 's6'];

export function planAvailability(s) {
  const gift = s.offers.gift === 'accepted';
  const a = {
    L: gift ? { open: true, reason: null } : { open: false, reason: 'plan.needGift' },
    H: !gift ? { open: false, reason: 'plan.needGift' }
      : s.offers.exchange === 'narrow' ? { open: true, reason: null } : { open: false, reason: 'plan.needExchange' },
    P: { open: false, reason: 'plan.nextVersion', next: true },
    W: { open: true, reason: null },
    N: s.offers.morrowN === 'taken' ? { open: true, reason: null } : { open: false, reason: 'plan.needMorrow' },
    F: { open: false, reason: 'plan.nextVersion', next: true },
  };
  return a;
}

setSignGuard((s, plan) => {
  const a = planAvailability(s)[plan];
  if (!a) return 'неизвестный план';
  if (!a.open) return a.reason;
  if (plan === 'N' && !s.riskApproved) return 'plan.needRisk';
  return null;
});

/* Смета: что оплачено из каких денег. Работы называются id, подписи берутся из данных миссии. */
export function ledger(s) {
  const spent = [];
  const pay = (work, cost) => spent.push({ work, cost });
  const deferred = [];
  let targetSpent = 0, kindTotal = 0, kindUsed = 0;
  const local = s.plan === 'L' || s.plan === 'H';

  if (local) {
    targetSpent = GIFT_UNITS;           // аппарат с доставкой — целевым даром
    pay('setup', 1);                   // установка и освоение
    pay('firstCheck', 1);              // первая оценка
    if (s.plan === 'H') { kindTotal = 1; if (s.s8.cycle) kindUsed = 1; }
    if (s.s9 === 'control') { pay('control', 1); deferred.push('research'); }
    if (s.s9 === 'research') { pay('research', 1); if (s.plan === 'L') deferred.push('control'); }
    if (s.s9 === 'reserve') { if (s.plan === 'L') deferred.push('control'); deferred.push('research'); }
  } else if (s.plan === 'N') {
    pay('kitting', 3);                 // невозвратная комплектация
    deferred.push('purchaseRest', 'setup', 'firstCheck', 'research');
  } else if (s.plan === 'W') {
    for (const k of ['group', 'method', 'research']) s.wAlloc?.[k] ? pay(k, 1) : deferred.push(k);
  }

  const used = spent.reduce((a, x) => a + x.cost, 0);
  const giftAccepted = s.offers.gift === 'accepted';
  return {
    free: { total: FREE_TOTAL, spent, left: FREE_TOTAL - used },
    target: {
      total: giftAccepted ? GIFT_UNITS : 0,
      spent: targetSpent,
      status: !giftAccepted ? 'none' : !s.plan ? 'pending' : local ? 'confirmed' : 'unused',
    },
    kind: { total: kindTotal, used: kindUsed },
    debt: 0,
    deferred,
  };
}

export function resolveFinal(s) {
  if (s.plan === 'W') return 'w';
  if (s.plan === 'N') return s.s8n.done ? 'n' : null;
  if (s.plan === 'H') return s.s9 ? 'h' : null;
  if (s.plan === 'L') return !s.s9 ? null : s.s9 === 'control' ? 'l' : 'r';
  return null;
}

export function stepAfterSign(s) {
  if (resolveFinal(s)) return 'final';
  if (s.plan === 'N') return 'scene/s8n';
  return s.s8.cycle ? 'scene/s9' : 'scene/s8';
}

const toRoute = (path) => { const [name, id] = path.split('/'); return id ? { name, id } : { name }; };

/* Куда на самом деле можно попасть по адресу. Защищает от «назад» в браузере и прямых ссылок. */
export function guardRoute(s, route) {
  const { name, id } = route;
  if (name === 'start') return route;
  if (!s.plan) {
    if (name === 'final' || name === 'review') return { name: 'city' };
    if (name === 'scene' && !PRE_COUNCIL.includes(id)) return { name: 'city' };
    return route;
  }
  const step = toRoute(stepAfterSign(s));
  if (name === 'final' || name === 'review') return resolveFinal(s) ? route : step;
  if (name === 'scene') {
    const local = s.plan === 'L' || s.plan === 'H';
    const ok = (id === 's8' && local) || (id === 's9' && local && s.s8.cycle) || (id === 's8n' && s.plan === 'N');
    return ok ? route : step;
  }
  return step;
}
