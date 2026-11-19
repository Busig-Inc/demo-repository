/* Стили подключаются под экран: так страницы пакета не мешают друг другу (.stage, .drawer есть в нескольких).
   CSS берётся как текст, относительные пути img/… и fonts/… считаются от index.html. */
import fonts from '../styles/fonts.css?raw';
import tokens from '../styles/tokens.css?raw';
import assets from '../styles/assets.css?raw';
import components from '../styles/components.css?raw';
import scene from '../styles/scene.css?raw';
import app from '../styles/app.css?raw';
import start from '../styles/screens/start.css?raw';
import world from '../styles/screens/world.css?raw';
import city from '../styles/screens/city.css?raw';
import council from '../styles/screens/council.css?raw';

const SETS = {
  start: [tokens, assets, start, app],
  world: [tokens, assets, world, app],
  city: [tokens, assets, city, app],
  council: [tokens, assets, components, council, app],
  scene: [tokens, assets, components, scene, app],
};

let el;
export function useStyles(name) {
  if (!document.getElementById('fonts-style')) {
    const f = document.createElement('style'); f.id = 'fonts-style'; f.textContent = fonts; document.head.append(f);
  }
  el ||= Object.assign(document.createElement('style'), { id: 'screen-style' });
  if (!el.isConnected) document.head.append(el);
  const css = SETS[name].join('\n');
  if (el.dataset.set !== name) { el.textContent = css; el.dataset.set = name; }
}
