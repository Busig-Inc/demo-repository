/* Личный разбор S11: путь, возможности, причины, история, одно изменённое решение, записка. */
import { t } from '../kit.js';
import { renderScene } from './scene.js';

export function renderReview(root, ctx) {
  const s = ctx.store.get();
  if (s.at !== 'review') ctx.store.dispatch({ type: 'go', to: 'review' });
  const T = (k) => t('review.tabs.' + k);
  const S = {
    id: 'review', bg: 'archive', label: 'Миссия «Инсулин» · S11 · ' + t('review.kicker'), title: 'Возвращение в архив', back: null,
    speaker: { name: 'Архивариус', role: 'Хранитель карты', portrait: 'img/portraits/archivist.jpg' },
    lines: ['Вы снова стоите у стола с картой. Флакон лежит в футляре. Архивариус пододвигает к нему вашу папку: «Тяжелее стала». Внутри карта ваших действий.' + (s.original ? ' ' + t('review.replayBanner') : '')],
    topics: [{ t: 'Зачем записка', a: '«Когда вернётесь, положите сюда свою записку. Я каждый раз забываю спросить людей, что они собираются делать потом».' }],
    actions: [
      { id: 'path', label: T('path'), hint: 'Последовательность решений', window: { type: 'timeline', title: T('path') }, effect: () => [] },
      { id: 'opps', label: T('opps'), hint: 'Использовано и упущено', window: { type: 'opportunities', title: T('opps') }, effect: () => [] },
      { id: 'causes', label: T('causes'), hint: 'Условия и последствия', window: { type: 'causes', title: T('causes') }, effect: () => [] },
      { id: 'facts', label: T('facts'), hint: 'Историческая справка', window: { type: 'facts', title: T('facts') }, effect: () => [] },
      { id: 'alt', label: T('alt'), hint: 'Пересчёт в копии', window: { type: 'counterfactual', title: T('alt') }, effect: () => [] },
      { id: 'note', label: T('note'), hint: 'О вашей организации', window: { type: 'note', title: t('ui.noteTitle') }, effect: (o) => ({ type: 'note', fields: o.value }) },
    ],
    required: ['path', 'opps', 'note'],
    next: { label: t('ui.toWorld'), href: 'world' },
  };
  renderScene(root, S, { ...ctx, kind: 'review' });
}
