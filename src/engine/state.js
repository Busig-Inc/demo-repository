/* Состояние миссии и эффекты. Чистые функции, без DOM.
   Экран сообщает результат окна, данные миссии превращают его в эффект, apply() применяет эффект. */

export const SCHEMA_VERSION = 1;

export function createState() {
  return {
    v: SCHEMA_VERSION,
    at: 'start',
    visited: [],
    folder: [],
    journal: [],
    request: null,        // 'full' | 'invoice'
    costsSeenAt: null,    // 'S1' | 'S7'
    hospital: null,       // 'honest' | 'overpromise'
    offers: { gift: 'none', exchange: 'none', pilot: 'none', morrowN: 'none', morrowF: 'none' },
    researchPlaced: false,
    plan: null,           // 'L' | 'H' | 'N' | 'W' (P, F — следующая версия)
    wAlloc: null,         // { group, method, research }
    riskApproved: false,
    s8: { compared: false, cycle: false },
    s8n: { advance: false, refund: false, done: false },
    s9: null,             // 'control' | 'research' | 'reserve'
    acts: {},             // выполненные действия сцен: 's1.journal' → true
    snapshots: {},
  };
}

export const OFFER_VALUES = {
  gift: ['seen', 'accepted', 'declined'],
  exchange: ['broad', 'narrow', 'refused'],
  pilot: ['seen'],
  morrowN: ['seen', 'taken', 'declined'],
  morrowF: ['seen'],
};

/* Проверка подписи подключается из rules.js, чтобы state.js не зависел от правил. */
let signGuard = () => null;
export function setSignGuard(fn) { signGuard = fn; }

const clone = (x) => structuredClone(x);
const snapshot = (s) => { const c = clone(s); c.snapshots = {}; return c; };
const fail = (msg) => { throw new Error(msg); };

const HANDLERS = {
  go(s, e) { s.at = e.to; },
  act(s, e) { (s.acts ||= {})[e.scene + '.' + e.id] = true; },
  visit(s, e) { if (!s.visited.includes(e.scene)) s.visited.push(e.scene); s.at = 'scene/' + e.scene; },
  doc(s, e) { if (!s.folder.includes(e.id)) s.folder.push(e.id); },
  request(s, e) {
    s.request = e.full ? 'full' : 'invoice';
    if (e.full && !s.plan && !s.costsSeenAt) s.costsSeenAt = s.at === 'council' ? 'S7' : 'S1';
  },
  hospital(s, e) { ['honest', 'overpromise'].includes(e.status) || fail('hospital: ' + e.status); s.hospital = e.status; },
  offer(s, e) {
    (OFFER_VALUES[e.key] || fail('offer key: ' + e.key)).includes(e.value) || fail('offer value: ' + e.value);
    s.offers[e.key] = e.value;
  },
  research(s) { s.researchPlaced = true; },
  note(s, e) { (Array.isArray(e.fields) && e.fields.length === 5) || fail('note: нужно 5 полей'); s.note = e.fields.map(String); },
  risk(s) { s.riskApproved = true; },
  sign(s, e) {
    if (s.plan) fail('План уже подписан');
    const why = signGuard(s, e.plan);
    if (why) fail('План ' + e.plan + ' закрыт: ' + why);
    s.snapshots.beforeSign = snapshot(s);
    if (s.request !== 'full') s.costsSeenAt = 'S7';
    s.plan = e.plan;
    if (e.plan === 'W') s.wAlloc = { group: !!e.wAlloc?.group, method: !!e.wAlloc?.method, research: !!e.wAlloc?.research };
  },
  s8(s, e) { ['compared', 'cycle'].includes(e.step) || fail('s8: ' + e.step); s.s8[e.step] = true; },
  s8n(s, e) { ['advance', 'refund', 'done'].includes(e.step) || fail('s8n: ' + e.step); s.s8n[e.step] = true; },
  s9(s, e) {
    ['control', 'research', 'reserve'].includes(e.choice) || fail('s9: ' + e.choice);
    if (s.s9) fail('Выбор в S9 уже сделан');
    s.snapshots.beforeS9 = snapshot(s);
    s.s9 = e.choice;
  },
};

const VALUE = { request: 'full', hospital: 'status', offer: 'value', sign: 'plan', s8: 'step', s8n: 'step', s9: 'choice', doc: 'id', go: 'to', visit: 'scene' };

function applyOne(s, e) {
  const h = HANDLERS[e && e.type] || fail('Неизвестный эффект: ' + (e && e.type));
  const scene = s.at.startsWith('scene/') ? s.at.slice(6) : s.at;
  h(s, e);
  if (e.type !== 'go' && e.type !== 'act') {
    const entry = { scene, type: e.type, value: e[VALUE[e.type]] ?? null };
    if (e.key) entry.key = e.key;
    s.journal.push(entry);
  }
}

export function apply(state, effect) {
  const s = clone(state);
  for (const e of [].concat(effect)) applyOne(s, e);
  return s;
}
