/* Мелкие помощники разметки: тексты, иконки, единицы, метки достоверности. */
import TEXTS from '../content/texts.ru.js';
import ICONS from './icons.js';

const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

export function t(key, vars) {
  const s = get(TEXTS, key);
  if (s == null) { console.warn('нет текста:', key); return key; }
  return vars ? String(s).replace(/\{(\w+)\}/g, (m, n) => (vars[n] != null ? vars[n] : m)) : s;
}

const byKey = Object.fromEntries(ICONS.map((o) => [o.k, o.b]));
export const ic = (name, size) => '<svg class="i' + (size ? ' s' + size : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (byKey[name] || '') + '</svg>';

/* Подставить иконки в <svg data-i="..."> внутри узла. */
export function paint(root) {
  root.querySelectorAll('svg[data-i]').forEach((el) => {
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = byKey[el.dataset.i] || '';
  });
}

/* Квадраты-единицы: f — есть, w — ждёт подтверждения, x — потрачено, g — в натуре. */
export const units = (n, c = 'f') => (n > 0 ? ('<i class="u ' + c + '"></i>').repeat(n) : '');

export const mark = (m) => (m === 'archive'
  ? '<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="currentColor"/></svg>' + t('ui.markArchive')
  : '<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' + t('ui.markGame'));

export function plural(n, key) {
  const f = t(key).split('|');
  const a = n % 100, b = n % 10;
  return n + ' ' + (a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]);
}

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* Подогнать холст 1280×720 под окно. Возвращает функцию отписки. */
export function fitStage(stage, signal) {
  const fit = () => { stage.style.transform = 'scale(' + Math.min(innerWidth / 1280, innerHeight / 720) + ')'; };
  fit();
  addEventListener('resize', fit, { signal });
}
