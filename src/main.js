/* Точка входа: состояние, роутер, экраны. Роутер не пускает туда, куда по правилам игры нельзя. */
import { createStore } from './ui/store.js';
import { start, go, toHash } from './ui/router.js';
import { guardRoute } from './engine/rules.js';
import { renderStart } from './ui/screens/start.js';
import { renderWorld } from './ui/screens/world.js';
import { renderCity } from './ui/screens/city.js';
import { renderScene } from './ui/screens/scene.js';
import { renderCouncil } from './ui/screens/council.js';
import { renderFinal } from './ui/screens/final.js';
import { renderReview } from './ui/screens/review.js';
import MISSION from './content/missions/insulin/index.js';

const store = createStore();
const app = document.getElementById('app');
let ctrl = null;

function sceneScreen(root, ctx, id) {
  const s = ctx.store.get();
  if (!s.visited.includes(id) || s.at !== 'scene/' + id) ctx.store.dispatch({ type: 'visit', scene: id });
  renderScene(root, MISSION.scene(id, ctx.store.get()), ctx);
}

const SCREENS = {
  start: renderStart, world: renderWorld, city: renderCity, council: renderCouncil,
  final: renderFinal, review: renderReview,
  scene: (root, ctx, route) => sceneScreen(root, ctx, route.id),
};

function show(route) {
  const allowed = guardRoute(store.get(), route.name === 'scene' && !MISSION.scenes[route.id] ? { name: 'city' } : route);
  if (allowed.name !== route.name || allowed.id !== route.id) { location.replace(toHash(allowed)); return; }
  ctrl?.abort();
  ctrl = new AbortController();
  app.replaceChildren();
  SCREENS[route.name](app, { store, go, signal: ctrl.signal }, route);
  document.title = (document.querySelector('h1')?.textContent || 'Архитектура финансирования') + ' · Архитектура финансирования';
}

start(show);
