/* Тесты к замечаниям финального ревью. Каждый сначала падал. */
import { describe, it, expect } from 'vitest';
import { createState, apply } from '../src/engine/state.js';
import { guardRoute, planAvailability } from '../src/engine/rules.js';
import { restoreFrom } from '../src/engine/review.js';
import MISSION from '../src/content/missions/insulin/index.js';
import { popupHTML } from '../src/ui/areas.js';

const preset = () => MISSION.presetBeforeCouncil('H');
const act = (scene, id) => ({ type: 'act', scene, id });
const finishL = (choice) => apply(apply(preset(), { type: 'sign', plan: 'L' }), [
  { type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }, act('s9', 'last'), { type: 's9', choice },
]);

describe('№1: после финала можно выйти на карту мира', () => {
  it('guardRoute пускает на world и start после финала', () => {
    const s = finishL('control');
    expect(guardRoute(s, { name: 'world' })).toEqual({ name: 'world' });
  });
  it('до финала, но после подписи world по-прежнему ведёт на текущий шаг', () => {
    const s = apply(preset(), { type: 'sign', plan: 'L' });
    expect(guardRoute(s, { name: 'world' })).toEqual({ name: 'scene', id: 's8' });
  });
});

describe('№2: выбор в S9 делается один раз', () => {
  it.each(['L', 'H'])('окно S9 (%s) нельзя подтвердить повторно, действие закрывается после выбора', (plan) => {
    let s = apply(preset(), [{ type: 'sign', plan }, { type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }]);
    const sc = MISSION.scene('s9', s);
    const a = sc.actions.find((x) => x.id === 'last');
    expect(a.window.once).toBe(true);
    s = apply(s, a.effect({ ok: true, value: plan === 'L' ? 'control' : 'research' }));
    expect(a.when(s)).toBe(false);
  });
});

describe('№3: «Пройти отсюда» для S9 возвращает невыполненное действие', () => {
  it('restoreFrom(s9:…) снимает отметку s9.last', () => {
    const r = restoreFrom(finishL('control'), 's9:research');
    expect(r.s9).toBe(null);
    expect(r.acts['s9.last']).toBeUndefined();
  });
});

describe('№4: неполный контрольный цикл не считается выполненным', () => {
  it('действие cycle в S8 выполнено только при s8.cycle', () => {
    const s = apply(preset(), [{ type: 'sign', plan: 'L' }, { type: 's8', step: 'compared' }, act('s8', 'cycle')]);
    const a = MISSION.scene('s8', s).actions.find((x) => x.id === 'cycle');
    expect(a.done(s)).toBe(false);
    expect(a.done(apply(s, { type: 's8', step: 'cycle' }))).toBe(true);
  });
});

describe('№5: отказ от обмена можно отменить, взяв приложение', () => {
  it('решение «взять» после отказа снимает отказ и открывает выбор обмена', () => {
    const a = MISSION.scene('s5', createState()).actions.find((x) => x.id === 'offers');
    let s = apply(createState(), a.effect({ ok: true, value: { card: 0, decision: 1 } }, createState()));
    expect(s.offers.exchange).toBe('refused');
    s = apply(s, a.effect({ ok: true, value: { card: 0, decision: 0 } }, s));
    expect(s.offers.exchange).toBe('none');
    const ex = MISSION.scene('s5', s).actions.find((x) => x.id === 'exchange');
    expect(ex.when(s)).toBe(true);
  });
});

describe('№10: «Пройти отсюда» с другим планом предлагает именно его', () => {
  it('restoreFrom(plan:L) после пресета H ставит L для совета', () => {
    const s = apply(apply(preset(), { type: 'sign', plan: 'H' }), [{ type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }, { type: 's9', choice: 'research' }]);
    const r = restoreFrom(s, 'plan:L');
    expect(r.demo).toBe('L');
    expect(planAvailability(r).L.open).toBe(true);
  });
});

describe('№11: неиспользованный дар не показывается как доступные деньги', () => {
  it('при подписанном N целевые деньги в смете 0 и помечены как не использованные', () => {
    const s = apply(preset(), [{ type: 'risk' }, { type: 'sign', plan: 'N' }]);
    const html = popupHTML('budget', s);
    expect(html).toMatch(/<span class="num">0<\/span><span><b>Целевые деньги/);
    expect(html).toMatch(/не использован/i);
  });
});
