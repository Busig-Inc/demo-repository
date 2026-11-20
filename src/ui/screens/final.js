/* Финал S10: короткая сцена и карточка итога. Какой финал, решает движок. */
import { t } from '../kit.js';
import { ledger, resolveFinal } from '../../engine/rules.js';
import { renderScene } from './scene.js';
import MISSION from '../../content/missions/insulin/index.js';

export function renderFinal(root, ctx) {
  const s = ctx.store.get();
  const code = resolveFinal(s);
  const F = MISSION.finals[code];
  const l = ledger(s);
  if (s.at !== 'final') ctx.store.dispatch({ type: 'go', to: 'final' });
  const S = {
    id: 'final', bg: F.bg, label: MISSION.review.labels.final, title: F.title, back: null,
    speaker: { name: 'Рассказ', role: '', portrait: null, narrator: true }, lines: [F.text], topics: [],
    actions: [{ id: 'result', label: t('ui.result'), hint: 'Что куплено, что сорвано, что отложено', window: { type: 'final', title: F.title, rows: F.rows(l, s), reflect: F.reflect(l, s) }, effect: () => [] }],
    required: ['result'],
    next: { label: t('final.toReview'), href: 'review' },
  };
  const scene = renderScene(root, S, { ...ctx, kind: 'final' });
  setTimeout(() => !ctx.signal.aborted && scene.openWin(S.actions[0]), 1400);
}
