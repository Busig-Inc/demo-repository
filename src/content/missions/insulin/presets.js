/* Быстрый показ для преподавателя: состояние прямо перед советом S7, собранное реальными эффектами. */
import { createState, apply } from '../../../engine/state.js';

const visit = (scene) => ({ type: 'visit', scene });
const doc = (id) => ({ type: 'doc', id });

/* Все предложения собраны, поэтому в совете открыты L, H, N и W, а в разборе есть с чем сравнивать. */
export function presetBeforeCouncil(route) {
  const s = apply(createState(), [
    visit('s0'), doc('pass'), doc('agreements'),
    visit('s1'), doc('journal'), { type: 'request', full: true }, doc('request'), doc('letter27'),
    visit('s2'), { type: 'hospital', status: 'honest' },
    visit('s3'), doc('costs'), doc('memo'),
    visit('s4'), doc('bundle'), { type: 'offer', key: 'gift', value: 'seen' }, { type: 'offer', key: 'gift', value: 'accepted' }, doc('gift'),
    visit('s5'), doc('annexCheck'), { type: 'offer', key: 'pilot', value: 'seen' }, { type: 'offer', key: 'exchange', value: 'narrow' }, doc('exchange'),
    visit('s5m'), { type: 'offer', key: 'morrowN', value: 'taken' }, doc('morrowN'), { type: 'offer', key: 'morrowF', value: 'seen' },
    visit('s6'), { type: 'research' },
    { type: 'go', to: 'council' },
  ]);
  s.demo = route;
  return s;
}
