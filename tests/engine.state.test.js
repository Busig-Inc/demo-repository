import { describe, it, expect, beforeEach } from 'vitest';
import { createState, apply } from '../src/engine/state.js';
import { save, load, clearSave, KEY } from '../src/engine/save.js';

// Минимальное хранилище вместо localStorage браузера.
function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

const withGift = () => apply(createState(), [
  { type: 'request', full: true },
  { type: 'offer', key: 'gift', value: 'accepted' },
]);

describe('apply', () => {
  it('не мутирует исходное состояние', () => {
    const s = createState();
    const frozen = JSON.stringify(s);
    const next = apply(s, { type: 'hospital', status: 'honest' });
    expect(JSON.stringify(s)).toBe(frozen);
    expect(next.hospital).toBe('honest');
  });

  it('пишет действие в журнал', () => {
    const s = apply(createState(), { type: 'visit', scene: 's1' });
    const t = apply(s, { type: 'request', full: false });
    expect(t.journal.at(-1)).toMatchObject({ scene: 's1', type: 'request', value: false });
  });

  it('полный запрос в S1 отмечает, что расходы замечены в S1', () => {
    expect(withGift().costsSeenAt).toBe('S1');
  });

  it('подпись создаёт снапшот до подписи', () => {
    const s = apply(withGift(), { type: 'sign', plan: 'L' });
    expect(s.plan).toBe('L');
    expect(s.snapshots.beforeSign.plan).toBe(null);
  });

  it('при неполном запросе подпись отмечает, что расходы замечены в совете', () => {
    const s = apply(createState(), [{ type: 'request', full: false }, { type: 'offer', key: 'gift', value: 'accepted' }, { type: 'sign', plan: 'L' }]);
    expect(s.costsSeenAt).toBe('S7');
  });

  it('вторая подпись запрещена', () => {
    const s = apply(withGift(), { type: 'sign', plan: 'L' });
    expect(() => apply(s, { type: 'sign', plan: 'W', wAlloc: { group: true } })).toThrow();
  });

  it('неизвестный эффект отвергается', () => {
    expect(() => apply(createState(), { type: 'magic' })).toThrow();
  });

  it('недопустимое значение предложения отвергается', () => {
    expect(() => apply(createState(), { type: 'offer', key: 'gift', value: 'stolen' })).toThrow();
  });

  it('выбор в S9 создаёт снапшот до S9', () => {
    const s = apply(withGift(), [{ type: 'sign', plan: 'L' }, { type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }, { type: 's9', choice: 'control' }]);
    expect(s.s9).toBe('control');
    expect(s.snapshots.beforeS9.s9).toBe(null);
  });
});

describe('save / load', () => {
  let st;
  beforeEach(() => { st = memoryStorage(); });

  it('сохраняет и загружает то же состояние', () => {
    const s = apply(withGift(), { type: 'sign', plan: 'L' });
    save(s, st);
    expect(load(st)).toEqual({ state: s, reset: false });
  });

  it('пустое хранилище: нет сохранения, без сброса', () => {
    expect(load(st)).toEqual({ state: null, reset: false });
  });

  it('испорченное сохранение сбрасывается', () => {
    st.setItem(KEY, '{oops');
    expect(load(st)).toEqual({ state: null, reset: true });
    expect(st.getItem(KEY)).toBe(null);
  });

  it('сохранение старой версии сбрасывается', () => {
    st.setItem(KEY, JSON.stringify({ ...createState(), v: 0 }));
    expect(load(st)).toEqual({ state: null, reset: true });
  });

  it('clearSave удаляет сохранение', () => {
    save(createState(), st);
    clearSave(st);
    expect(load(st).state).toBe(null);
  });
});
