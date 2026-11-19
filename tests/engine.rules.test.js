import { describe, it, expect } from 'vitest';
import { createState, apply } from '../src/engine/state.js';
import { planAvailability, ledger, resolveFinal, stepAfterSign, guardRoute } from '../src/engine/rules.js';

const base = () => apply(createState(), { type: 'request', full: true });
const giftOnly = () => apply(base(), { type: 'offer', key: 'gift', value: 'accepted' });
const giftAndExchange = () => apply(giftOnly(), { type: 'offer', key: 'exchange', value: 'narrow' });
const throughS8 = (s) => apply(s, [{ type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }]);

const routes = {
  'L + control': () => apply(throughS8(apply(giftOnly(), { type: 'sign', plan: 'L' })), { type: 's9', choice: 'control' }),
  'L + research': () => apply(throughS8(apply(giftOnly(), { type: 'sign', plan: 'L' })), { type: 's9', choice: 'research' }),
  'L + reserve': () => apply(throughS8(apply(giftOnly(), { type: 'sign', plan: 'L' })), { type: 's9', choice: 'reserve' }),
  'H + research': () => apply(throughS8(apply(giftAndExchange(), { type: 'sign', plan: 'H' })), { type: 's9', choice: 'research' }),
  'H + reserve': () => apply(throughS8(apply(giftAndExchange(), { type: 'sign', plan: 'H' })), { type: 's9', choice: 'reserve' }),
  N: () => apply(base(), [{ type: 'offer', key: 'morrowN', value: 'taken' }, { type: 'risk' }, { type: 'sign', plan: 'N' }, { type: 's8n', step: 'done' }]),
  'W {group,method,research}': () => apply(base(), { type: 'sign', plan: 'W', wAlloc: { group: true, method: true, research: true } }),
  'W {group}': () => apply(base(), { type: 'sign', plan: 'W', wAlloc: { group: true } }),
};

// Таблица сценария «Расходы и последовательность».
const table = [
  ['L + control', 0, 4, 0, 0, 'l'],
  ['L + research', 0, 4, 0, 0, 'r'],
  ['L + reserve', 1, 4, 0, 0, 'r'],
  ['H + research', 0, 4, 1, 0, 'h'],
  ['H + reserve', 1, 4, 1, 0, 'h'],
  ['N', 0, 0, 0, 0, 'n'],
  ['W {group,method,research}', 0, 0, 0, 0, 'w'],
  ['W {group}', 2, 0, 0, 0, 'w'],
];

describe('ledger и финал по таблице сценария', () => {
  it.each(table)('%s', (name, freeLeft, targetSpent, kindUsed, debt, final) => {
    const s = routes[name]();
    const l = ledger(s);
    expect(l.free.total).toBe(3);
    expect(l.free.left).toBe(freeLeft);
    expect(l.target.spent).toBe(targetSpent);
    expect(l.kind.used).toBe(kindUsed);
    expect(l.debt).toBe(debt);
    expect(resolveFinal(s)).toBe(final);
  });

  it('отложенные работы: L с контролем откладывает исследование, L с исследованием — контроль', () => {
    expect(ledger(routes['L + control']()).deferred).toContain('research');
    expect(ledger(routes['L + research']()).deferred).toContain('control');
  });

  it('свободный резерв никогда не уходит в минус', () => {
    for (const make of Object.values(routes)) expect(ledger(make()).free.left).toBeGreaterThanOrEqual(0);
  });

  it('до конца маршрута финала нет', () => {
    expect(resolveFinal(giftOnly())).toBe(null);
    expect(resolveFinal(apply(giftOnly(), { type: 'sign', plan: 'L' }))).toBe(null);
  });
});

describe('planAvailability', () => {
  it('при отказе и от дара, и от Морроу открыт только W', () => {
    const s = apply(base(), [{ type: 'offer', key: 'gift', value: 'declined' }, { type: 'offer', key: 'morrowN', value: 'declined' }]);
    const a = planAvailability(s);
    expect(Object.entries(a).filter(([, v]) => v.open).map(([k]) => k)).toEqual(['W']);
  });

  it('H закрыт, если в обмен отправлено всё', () => {
    const s = apply(giftOnly(), { type: 'offer', key: 'exchange', value: 'broad' });
    expect(planAvailability(s).H).toEqual({ open: false, reason: 'plan.needExchange' });
    expect(planAvailability(s).L.open).toBe(true);
  });

  it('P и F помечены как следующая версия', () => {
    const a = planAvailability(giftAndExchange());
    expect(a.P).toMatchObject({ open: false, next: true });
    expect(a.F).toMatchObject({ open: false, next: true });
  });

  it('L без дара подписать нельзя', () => {
    expect(() => apply(base(), { type: 'sign', plan: 'L' })).toThrow();
  });

  it('N без подтверждения риска подписать нельзя', () => {
    const s = apply(base(), { type: 'offer', key: 'morrowN', value: 'taken' });
    expect(planAvailability(s).N.open).toBe(true);
    expect(() => apply(s, { type: 'sign', plan: 'N' })).toThrow();
  });
});

describe('stepAfterSign и guardRoute', () => {
  it('после подписи L следующий шаг — S8, затем S9, затем финал', () => {
    const s = apply(giftOnly(), { type: 'sign', plan: 'L' });
    expect(stepAfterSign(s)).toBe('scene/s8');
    expect(stepAfterSign(throughS8(s))).toBe('scene/s9');
    expect(stepAfterSign(routes['L + control']())).toBe('final');
  });

  it('после подписи N — S8N, после W — сразу финал', () => {
    const s = apply(base(), [{ type: 'offer', key: 'morrowN', value: 'taken' }, { type: 'risk' }, { type: 'sign', plan: 'N' }]);
    expect(stepAfterSign(s)).toBe('scene/s8n');
    expect(stepAfterSign(routes['W {group}']())).toBe('final');
  });

  it('после подписи места до совета закрыты', () => {
    const s = apply(giftOnly(), { type: 'sign', plan: 'L' });
    expect(guardRoute(s, { name: 'scene', id: 's4' })).toEqual({ name: 'scene', id: 's8' });
    expect(guardRoute(s, { name: 'city' })).toEqual({ name: 'scene', id: 's8' });
    expect(guardRoute(s, { name: 'council' })).toEqual({ name: 'scene', id: 's8' });
  });

  it('до подписи финал, разбор и сцены после совета закрыты', () => {
    const s = giftOnly();
    for (const r of [{ name: 'final' }, { name: 'review' }, { name: 'scene', id: 's8' }, { name: 'scene', id: 's9' }, { name: 'scene', id: 's8n' }])
      expect(guardRoute(s, r)).toEqual({ name: 'city' });
  });

  it('S9 недоступен, пока не составлен контрольный цикл', () => {
    const s = apply(giftOnly(), { type: 'sign', plan: 'L' });
    expect(guardRoute(s, { name: 'scene', id: 's9' })).toEqual({ name: 'scene', id: 's8' });
  });

  it('после финала разбор открыт, старт тоже', () => {
    const s = routes['H + research']();
    expect(guardRoute(s, { name: 'review' })).toEqual({ name: 'review' });
    expect(guardRoute(s, { name: 'final' })).toEqual({ name: 'final' });
    expect(guardRoute(s, { name: 'start' })).toEqual({ name: 'start' });
  });

  it('до подписи сцены места открыты', () => {
    expect(guardRoute(base(), { name: 'scene', id: 's4' })).toEqual({ name: 'scene', id: 's4' });
  });
});
