import { describe, it, expect } from 'vitest';
import { createState, apply } from '../src/engine/state.js';
import { planAvailability, resolveFinal, ledger } from '../src/engine/rules.js';
import MISSION from '../src/content/missions/insulin/index.js';
import T from '../src/content/texts.ru.js';

const WINDOW_TYPES = ['doc', 'pack', 'choice', 'offers', 'assign', 'match', 'calendar', 'compare'];
const ROUTES = /^(city|council|final|review|world|start|scene\/(s0|s1|s2|s3|s4|s5|s5m|s6|s8|s8n|s9))$/;

const subsets = (n) => Array.from({ length: 1 << n }, (_, m) => [...Array(n).keys()].filter((i) => m & (1 << i)));

function outcomes(w) {
  switch (w.type) {
    case 'pack': return subsets(w.items.length).filter((x) => x.length).map((sel) => ({
      ok: w.must.every((i) => sel.includes(i)) && !w.items.some((it, i) => it.avoid && sel.includes(i)), value: sel }));
    case 'choice': return w.options.map((o, i) => ({ ok: !!o.good, value: o.value ?? i }));
    case 'offers': return w.cards.flatMap((c, card) => c.decisions.map((_, decision) => ({ ok: true, value: { card, decision } })));
    case 'assign': return w.sources.map((src) => ({ ok: true, value: Object.fromEntries(w.works.map((_, i) => [i, src.k])) }));
    default: return [{ ok: true, value: null }];
  }
}

const preset = () => MISSION.presetBeforeCouncil('H');
const stateFor = (id) => {
  if (id === 's8' || id === 's9') {
    const s = apply(preset(), { type: 'sign', plan: 'L' });
    return id === 's9' ? apply(s, [{ type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }]) : s;
  }
  if (id === 's8n') return apply(preset(), [{ type: 'risk' }, { type: 'sign', plan: 'N' }]);
  return createState();
};

const sceneIds = ['s0', 's1', 's2', 's3', 's4', 's5', 's5m', 's6', 's8', 's8n', 's9'];
const allScenes = () => sceneIds.flatMap((id) => {
  const st = stateFor(id);
  if (id !== 's9') return [[id, st, MISSION.scene(id, st)]];
  const h = apply(apply(preset(), { type: 'sign', plan: 'H' }), [{ type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }]);
  return [[id + ':L', st, MISSION.scene(id, st)], [id + ':H', h, MISSION.scene(id, h)]];
});

describe('сцены миссии', () => {
  it.each(allScenes())('%s: окна известного типа, у каждого действия есть эффект', (id, st, sc) => {
    expect(sc.actions.length).toBeGreaterThan(0);
    for (const a of sc.actions) {
      expect(WINDOW_TYPES).toContain(a.window.type);
      expect(typeof a.effect).toBe('function');
    }
  });

  it.each(allScenes())('%s: каждый вариант эффекта принимается движком', (id, st, sc) => {
    for (const a of sc.actions) for (const o of outcomes(a.window)) {
      const e = a.effect(o);
      expect(() => apply(st, e)).not.toThrow();
    }
  });

  it.each(allScenes())('%s: переходы ведут на существующие экраны', (id, st, sc) => {
    const next = typeof sc.next === 'function' ? sc.next(st) : sc.next;
    expect(next.href).toMatch(ROUTES);
    for (const l of sc.links || []) expect(l.href).toMatch(ROUTES);
    for (const r of sc.required || []) expect(sc.actions.map((a) => a.id)).toContain(r);
  });

  it.each(allScenes())('%s: у каждого документа есть метка достоверности', (id, st, sc) => {
    for (const a of sc.actions) if (['doc', 'offers', 'compare', 'match'].includes(a.window.type) && a.window.type === 'doc') expect(['archive', 'game']).toContain(a.window.mark);
  });

  it('места Торонто ведут на сцены или совет', () => {
    for (const p of MISSION.places) expect(p.href).toMatch(ROUTES);
  });

  it('у каждого документа папки есть название и метка', () => {
    for (const d of Object.values(MISSION.docs)) { expect(d.t).toBeTruthy(); expect(['archive', 'game']).toContain(d.mark); }
  });
});

describe('пресеты быстрого показа', () => {
  it.each(['H', 'L', 'N'])('пресет %s открывает свой план', (r) => {
    const s = MISSION.presetBeforeCouncil(r);
    expect(planAvailability(s)[r].open).toBe(true);
    expect(s.at).toBe('council');
  });
});

describe('финалы', () => {
  const routes = {
    h: () => apply(apply(preset(), { type: 'sign', plan: 'H' }), [{ type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }, { type: 's9', choice: 'research' }]),
    l: () => apply(apply(preset(), { type: 'sign', plan: 'L' }), [{ type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }, { type: 's9', choice: 'control' }]),
    r: () => apply(apply(preset(), { type: 'sign', plan: 'L' }), [{ type: 's8', step: 'compared' }, { type: 's8', step: 'cycle' }, { type: 's9', choice: 'reserve' }]),
    n: () => apply(preset(), [{ type: 'risk' }, { type: 'sign', plan: 'N' }, { type: 's8n', step: 'done' }]),
    w: () => apply(preset(), { type: 'sign', plan: 'W', wAlloc: { group: true } }),
  };
  it.each(Object.keys(routes))('финал %s собирается из состояния', (code) => {
    const s = routes[code]();
    expect(resolveFinal(s)).toBe(code);
    const F = MISSION.finals[code];
    expect(F.title).toBeTruthy();
    const rows = F.rows(ledger(s), s);
    expect(rows.length).toBeGreaterThan(2);
    for (const [k, v] of rows) { expect(k).toBeTruthy(); expect(v).toBeTruthy(); }
    expect(F.reflect(ledger(s), s)).toBeTruthy();
  });
});

describe('словарь', () => {
  it('ключи причин закрытия планов есть в словаре', () => {
    for (const k of ['needGift', 'needExchange', 'needMorrow', 'needRisk', 'nextVersion']) expect(T.plan[k]).toBeTruthy();
    expect(T.ui.units).toBe('ед.');
  });
});

describe('видимый текст без внутренних кодов сцен', () => {
  const CODE = /\bS\d+[A-Z]?\b/;
  it('подписи финала и разбора без кодов', () => {
    expect(MISSION.review.labels.final).not.toMatch(CODE);
    expect(MISSION.review.labels.review).not.toMatch(CODE);
  });
  it('у каждого кода сцены есть название места для разбора', () => {
    for (const code of new Set(Object.values(MISSION.review.sceneCode))) {
      expect(MISSION.review.scenePlace[code]).toBeTruthy();
      expect(MISSION.review.scenePlace[code]).not.toMatch(CODE);
    }
    for (const c of MISSION.review.causes) expect(MISSION.review.scenePlace[c.id.replace(/[LH]$/, '')]).toBeTruthy();
  });
});
