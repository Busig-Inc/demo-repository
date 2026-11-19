/* Совет S7: выбор и подпись одного плана (перенос экран_план.html на состояние игры).
   Доступность планов считает движок; закрытый план объясняет, что сделать. Подпись необратима. */
import { t, ic, esc, fitStage } from '../kit.js';
import { useStyles } from '../styles.js';
import { areasHTML, wireAreas } from '../areas.js';
import { planAvailability, stepAfterSign } from '../../engine/rules.js';
import MISSION from '../../content/missions/insulin/index.js';

export function renderCouncil(root, { store, go, signal }) {
  useStyles('council');
  if (store.get().at !== 'council') store.dispatch({ type: 'go', to: 'council' });
  const P = MISSION.plans;
  const avail = () => planAvailability(store.get());
  const firstOpen = () => ['H', 'L', 'N', 'W'].find((k) => avail()[k].open);
  let cur = store.get().demo && avail()[store.get().demo]?.open ? store.get().demo : firstOpen();
  const alloc = { group: true, method: true, research: true };
  let confirming = false;

  root.innerHTML = '<div class="fit"><div class="stage" id="stage">'
    + '<div class="top"><img src="logo/logo-mark.svg" alt="' + t('app.name') + '" width="44" height="44" style="flex:none;margin-top:-4px">'
    + '<button class="iconbtn" data-go="city">' + ic('back', 20) + '<span>' + t('nav.toToronto') + '</span></button>'
    + '<div class="where"><span class="lbl lamp">' + t('s7.label') + '</span><h1>' + t('s7.title') + '</h1></div>'
    + '<div data-r="areas" class="areas-slot">' + areasHTML(store.get(), cur) + '</div></div>'
    + '<div class="dlg council-dlg"><div class="say"><div class="arch" role="img" aria-label="Роберт Дефриз"></div><div><b>' + t('s7.who') + '</b><p data-r="line"></p></div></div></div>'
    + '<section class="panel right closed" data-r="panel" aria-label="' + t('s7.rightAria') + '">'
    + '<button class="closex" data-r="closePlan" aria-label="' + t('s7.closeAria') + '">' + ic('close', 20) + '</button>'
    + '<div><span class="lbl lamp">' + t('plan.kicker') + '</span><h2 class="plan-q">' + t('plan.title') + '</h2></div>'
    + '<div class="plans" role="radiogroup" aria-label="' + t('s7.plansAria') + '" data-r="plans"></div>'
    + '<div data-r="detail"></div>'
    + '</section>'
    + '<button class="cta" data-r="choose"><span>' + t('plan.pick') + '</span>' + ic('next', 20) + '</button>'
    + '<div class="pop" data-r="pop" hidden></div></div></div>';

  const $ = (r) => root.querySelector('[data-r="' + r + '"]');
  const stage = root.querySelector('#stage');
  fitStage(stage, signal);
  stage.classList.add('intro');
  const showAll = () => { stage.classList.remove('intro'); stage.classList.add('shown'); };
  const timer = setTimeout(showAll, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200);
  signal.addEventListener('abort', () => clearTimeout(timer));
  addEventListener('keydown', showAll, { signal, once: true });
  stage.addEventListener('click', showAll, { signal, once: true });

  function drawPlans() {
    const a = avail();
    $('plans').innerHTML = MISSION.planOrder.map((k) => '<button role="radio" data-plan="' + k + '" aria-checked="' + (k === cur) + '"' + (a[k].open ? '' : ' class="closed"') + '>'
      + k + '<small>' + P[k].name + '</small>' + (a[k].open ? '' : ic('locked', 16)) + '</button>').join('');
  }

  function drawDetail() {
    const s = store.get(); const a = avail()[cur]; const p = P[cur];
    $('line').textContent = p.line || t('s7.line');
    $('areas').innerHTML = areasHTML(s, a.open ? cur : null);
    let h = '<h3 class="plan-name">' + cur + ' · ' + esc(p.full) + '</h3>';
    if (!a.open) {
      h += '<div class="plan-closed">' + ic('locked', 20) + '<p>' + t(a.reason) + '</p></div>'
        + '<div class="signsum">' + p.rows.map(([x, y]) => '<div class="r"><span>' + x + '</span><div>' + y + '</div></div>').join('') + '</div>'
        + (a.next ? '' : '<button class="btn-second" data-go="city">' + ic('back', 20) + '<span>' + t('plan.toCity') + '</span></button>');
      $('detail').innerHTML = h; return;
    }
    const gap = s.request !== 'full';
    if (gap) h += '<div class="warn-box">' + ic('risk', 20) + '<div><b>Запрос на поддержку без освоения и проверки</b><p>Дефицит обнаружился здесь: после покупки нужны люди и проверка. Дополните запрос, прежде чем подписывать.</p><button class="btns2" data-r="supplement">Дополнить запрос</button></div></div>';
    h += '<div class="signsum">' + p.rows.map(([x, y]) => '<div class="r"><span>' + x + '</span><div>' + y + '</div></div>').join('') + '</div>';
    if (cur === 'W') {
      h += '<fieldset class="alloc"><legend>' + t('plan.allocTitle') + '</legend>' + p.alloc.map((x) => '<label class="pk-row"><input type="checkbox" data-alloc="' + x.k + '"' + (alloc[x.k] ? ' checked' : '') + '><span><b>' + x.t + '</b><small>' + x.h + '</small></span><em>1</em></label>').join('') + '<p class="hint">' + t('plan.allocNote') + ' В резерве останется: ' + (3 - Object.values(alloc).filter(Boolean).length) + ' ед.</p></fieldset>';
    }
    const needRisk = cur === 'N' && !s.riskApproved;
    if (cur === 'N') {
      h += '<div class="risk-box' + (s.riskApproved ? ' ok' : '') + '">' + ic('risk', 20) + '<div><b>' + t('plan.riskTitle') + '</b><p>' + p.risk.text + '</p>'
        + (s.riskApproved ? '<p class="okline">' + ic('done', 16) + 'Риск принят: ' + p.risk.units + ' ед.</p>' : '<button class="btns2" data-r="risk">' + t('plan.riskYes', { n: p.risk.units }) + '</button>') + '</div></div>';
    }
    h += '<span class="stampm"><svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' + t('s7.stamp') + '</span>';
    if (confirming) {
      h += '<div class="confirm" role="alertdialog" aria-labelledby="cfT"><b id="cfT">' + t('plan.confirmTitle', { plan: cur }) + '</b><p>' + t('plan.confirmText') + '</p><div class="row"><button class="btns2" data-r="cancel">' + t('plan.confirmNo') + '</button><button class="sign" data-r="yes"><span>' + t('plan.confirmYes') + '</span>' + ic('next', 20) + '</button></div></div>';
    } else {
      h += '<button class="sign" data-r="sign"' + (needRisk || gap ? ' disabled' : '') + '><span>' + t('plan.sign') + '</span>' + ic('next', 20) + '</button>'
        + '<span class="note">' + (needRisk ? t('plan.needRisk') : t('plan.signNote')) + '</span>';
    }
    $('detail').innerHTML = h;
    if (confirming) $('yes').focus();
  }

  const setPanel = (o) => { $('panel').classList.toggle('closed', !o); $('choose').hidden = o; if (o) { closePop(); showAll(); $('plans').querySelector('[aria-checked="true"]')?.focus(); } };
  const closePop = wireAreas(root, $('pop'), store, { signal, getPlan: () => (avail()[cur].open ? cur : null) });
  drawPlans(); drawDetail();

  root.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
    const pb = e.target.closest('[data-plan]');
    if (pb) { cur = pb.dataset.plan; confirming = false; drawPlans(); drawDetail(); $('plans').querySelector('[data-plan="' + cur + '"]').focus(); return; }
    const r = e.target.closest('[data-r]')?.dataset.r;
    if (r === 'choose') setPanel(true);
    else if (r === 'closePlan') setPanel(false);
    else if (r === 'supplement') { store.dispatch({ type: 'request', full: true }); drawDetail(); }
    else if (r === 'risk') { store.dispatch({ type: 'risk' }); drawDetail(); }
    else if (r === 'sign') { confirming = true; drawDetail(); }
    else if (r === 'cancel') { confirming = false; drawDetail(); }
    else if (r === 'yes') {
      store.dispatch({ type: 'sign', plan: cur, ...(cur === 'W' ? { wAlloc: { ...alloc } } : {}) });
      go(stepAfterSign(store.get()));
    }
  }, { signal });
  root.addEventListener('change', (e) => {
    const c = e.target.closest('[data-alloc]'); if (!c) return;
    alloc[c.dataset.alloc] = c.checked; drawDetail();
  }, { signal });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (confirming) { confirming = false; drawDetail(); } else { closePop(); setPanel(false); }
  }, { signal });
  if (store.get().demo) setPanel(true);
}
