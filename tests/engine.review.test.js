import { describe, it, expect } from 'vitest';
import { createState, apply } from '../src/engine/state.js';
import { resolveFinal } from '../src/engine/rules.js';
import { pathSteps, opportunityMap, causeChains, alternatives, counterfactual, restoreFrom } from '../src/engine/review.js';
import content from '../src/content/missions/insulin/review.js';

const at = (scene) => ({ type: 'visit', scene });
const collectAll = () => apply(createState(), [
  at('s1'), { type: 'request', full: true },
  at('s2'), { type: 'hospital', status: 'honest' },
  at('s4'), { type: 'offer', key: 'gift', value: 'accepted' },
  at('s5'), { type: 'offer', key: 'exchange', value: 'narrow' }, { type: 'offer', key: 'pilot', value: 'seen' },
  at('s5m'), { type: 'offer', key: 'morrowN', value: 'taken' },
  at('s6'), { type: 'research' },
]);
const finish = (s, plan, choice) => apply(s, [
  { type: 'go', to: 'council' }, { type: 'sign', plan },
  at('s8'), { type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' },
  at('s9'), { type: 's9', choice },
]);
const Hresearch = () => finish(collectAll(), 'H', 'research');
const Lcontrol = () => finish(collectAll(), 'L', 'control');
const Nroute = () => apply(createState(), [
  at('s1'), { type: 'request', full: false },
  at('s5m'), { type: 'offer', key: 'morrowN', value: 'taken' },
  { type: 'go', to: 'council' }, { type: 'risk' }, { type: 'sign', plan: 'N' },
  at('s8n'), { type: 's8n', step: 'done' },
]);
const status = (map, id) => map.find((o) => o.id === id).status;

describe('opportunityMap', () => {
  it('путь H с исследованием использует дар, обмен и исследование', () => {
    const m = opportunityMap(Hresearch(), content);
    expect(status(m, 'gift')).toBe('used');
    expect(status(m, 'exchange')).toBe('used');
    expect(status(m, 'research')).toBe('used');
  });

  it('путь N: дар не найден, Морроу использован, в пояснении невозвратный аванс 3', () => {
    const m = opportunityMap(Nroute(), content);
    expect(['missed', 'declined']).toContain(status(m, 'gift'));
    const morrow = m.find((o) => o.id === 'morrow');
    expect(morrow.status).toBe('used');
    expect(morrow.note).toMatch(/невозвратн/i);
    expect(morrow.note).toMatch(/3/);
  });

  it('пилот в этой версии не считается упущенным', () => {
    const m = opportunityMap(Nroute(), content);
    expect(m.find((o) => o.id === 'pilot').note).toMatch(/следующей версии/);
  });

  it('у каждой возможности есть заголовок и допустимый статус', () => {
    for (const o of opportunityMap(Lcontrol(), content)) {
      expect(o.title).toBeTruthy();
      expect(['used', 'declined', 'missed', 'seen']).toContain(o.status);
    }
  });
});

describe('pathSteps', () => {
  it('неполный запрос отмечает, что расходы замечены только в совете', () => {
    const steps = pathSteps(Nroute(), content);
    expect(steps.some((x) => x.scene === 'S7' && /после покупки/.test(x.text))).toBe(true);
  });

  it('путь H содержит шаги S1, S4, S5, S7, S9 по порядку', () => {
    const scenes = pathSteps(Hresearch(), content).map((x) => x.scene);
    const order = ['S1', 'S4', 'S5', 'S7', 'S9'].map((x) => scenes.indexOf(x));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('causeChains', () => {
  it('выбирает от 2 до 4 цепочек по пути', () => {
    for (const s of [Hresearch(), Lcontrol(), Nroute()]) {
      const c = causeChains(s, content);
      expect(c.length).toBeGreaterThanOrEqual(2);
      expect(c.length).toBeLessThanOrEqual(4);
      for (const x of c) expect(Object.keys(x).sort()).toEqual(['action', 'basis', 'id', 'known', 'outcome']);
    }
  });

  it('у N есть цепочка о кассовом разрыве', () => {
    expect(causeChains(Nroute(), content).map((x) => x.id)).toContain('S5M');
  });
});

describe('alternatives и counterfactual', () => {
  it('после H предлагаются L и N, но не H', () => {
    const ids = alternatives(Hresearch()).map((a) => a.id);
    expect(ids).toContain('plan:L');
    expect(ids).toContain('plan:N');
    expect(ids).toContain('plan:W');
    expect(ids).not.toContain('plan:H');
    expect(ids).toContain('s9:reserve');
    expect(ids).not.toContain('s9:control');
  });

  it('если дар не был собран, L и H не предлагаются', () => {
    const ids = alternatives(Nroute()).map((a) => a.id);
    expect(ids).toEqual(['plan:W']);
  });

  it('H → L: контроль оплачивает уже не партнёр, а свободный резерв', () => {
    const cf = counterfactual(Hresearch(), 'plan:L', content);
    expect(cf.final).toBe('l');
    const row = cf.diff.find((d) => d.row === 'Кто оплатил контроль');
    expect(row).toMatchObject({ was: 'Партнёр, в натуре', now: 'Свободный резерв Connaught', changed: true });
  });

  it('L с контролем → исследование ведёт к финалу R', () => {
    expect(counterfactual(Lcontrol(), 's9:research', content).final).toBe('r');
  });

  it('альтернатива не меняет исходное прохождение', () => {
    const s = Hresearch();
    counterfactual(s, 'plan:N', content);
    expect(resolveFinal(s)).toBe('h');
  });

  it('restoreFrom возвращает состояние до подписи и хранит исходный путь', () => {
    const s = Hresearch();
    const r = restoreFrom(s, 'plan:L');
    expect(r.plan).toBe(null);
    expect(r.replayOf).toBe('plan:L');
    expect(r.original.final).toBe('h');
    expect(r.original.journal.length).toBe(s.journal.length);
  });
});
