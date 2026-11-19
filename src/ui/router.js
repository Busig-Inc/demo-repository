/* Hash-роутер: #/<экран>[/<id>]. Работает на GitHub Pages без настройки сервера. */
const NAMES = ['start', 'world', 'city', 'scene', 'council', 'final', 'review'];

export function parseHash(hash) {
  const [name, id] = String(hash || '').replace(/^#\/?/, '').split('/');
  if (!NAMES.includes(name)) return { name: 'start' };
  return id ? { name, id } : { name };
}

export function toHash(route) {
  return '#/' + route.name + (route.id ? '/' + route.id : '');
}

let handler = null;

export function start(onRoute) {
  handler = onRoute;
  addEventListener('hashchange', () => handler(parseHash(location.hash)));
  handler(parseHash(location.hash));
}

export function go(path) {
  const route = typeof path === 'string' ? parseHash('#/' + path) : path;
  const hash = toHash(route);
  if (location.hash === hash) handler(route);
  else location.hash = hash;
}
