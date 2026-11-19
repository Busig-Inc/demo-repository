/* Миссия «Инсулин» целиком. Новый кейс = новая папка рядом с тем же набором файлов. */
import { scenes, docs } from './scenes.js';
import { plans, PLAN_ORDER } from './plans.js';
import { finals } from './finals.js';
import { places, world } from './places.js';
import review from './review.js';
import { presetBeforeCouncil } from './presets.js';

export default {
  id: 'insulin',
  title: 'Инсулин',
  where: 'Торонто, лето 1922',
  scenes, docs, plans, planOrder: PLAN_ORDER, finals, places, world, review, presetBeforeCouncil,
  /* Сцена может зависеть от состояния (S9 разная для L и H). */
  scene(id, state) { const s = this.scenes[id]; return typeof s === 'function' ? s(state) : s; },
};
