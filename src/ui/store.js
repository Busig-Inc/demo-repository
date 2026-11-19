/* Одно место, где живёт состояние игры. dispatch применяет эффект, сохраняет и сообщает экрану. */
import { createState, apply } from '../engine/state.js';
import '../engine/rules.js'; // подключает проверку подписи планов
import { save, load, clearSave } from '../engine/save.js';

export function createStore() {
  const loaded = load();
  let state = loaded.state || createState();
  const subs = new Set();
  const emit = () => subs.forEach((f) => f(state));
  return {
    hadSave: !!loaded.state,
    wasReset: loaded.reset,
    get: () => state,
    dispatch(effect) { state = apply(state, effect); save(state); emit(); return state; },
    replace(next) { state = next; save(state); emit(); return state; },
    reset() { clearSave(); state = createState(); emit(); return state; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
  };
}
