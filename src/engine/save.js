/* Автосохранение прохождения в браузере. Несовместимое сохранение сбрасывается. */
import { SCHEMA_VERSION } from './state.js';

export const KEY = 'afg.insulin';
const store = (st) => st || globalThis.localStorage;

export function save(state, st) {
  try { store(st).setItem(KEY, JSON.stringify(state)); } catch { /* приватный режим: играем без сохранения */ }
}

export function load(st) {
  let raw;
  try { raw = store(st).getItem(KEY); } catch { return { state: null, reset: false }; }
  if (raw == null) return { state: null, reset: false };
  try {
    const s = JSON.parse(raw);
    if (s && s.v === SCHEMA_VERSION && Array.isArray(s.journal)) return { state: s, reset: false };
  } catch { /* ниже сброс */ }
  clearSave(st);
  return { state: null, reset: true };
}

export function clearSave(st) {
  try { store(st).removeItem(KEY); } catch { /* нечего чистить */ }
}
