/* Сквозной проход маршрутов в браузере.
   Запуск: npm run build && npx vite preview --port 4173, затем npm run e2e [-- папка-для-скриншотов].
   Проверяет финал на экране, разбор с альтернативами, перезагрузку после подписи и отсутствие ошибок в консоли. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://localhost:4173/';
const SHOTS = process.argv[2] || null;
const sizes = [[1440, 900], [1280, 720]];

const act = async (p, id) => { await p.click('.act2[data-w="' + id + '"]'); await p.waitForTimeout(150); };
const closeWin = async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(100); };
const next = async (p) => { await p.click('[data-r="next"]'); await p.waitForTimeout(400); };
const scene = async (p, id) => { await p.goto(BASE + '#/scene/' + id); await p.waitForTimeout(300); };
const pick = async (p, sel) => { await p.click(sel); await p.waitForTimeout(100); };
const confirm = async (p) => { await p.click('.wf .btnp:not([disabled])'); await p.waitForTimeout(150); };
const fresh = async (p) => { await p.goto(BASE + '#/start'); await p.evaluate(() => localStorage.removeItem('afg.insulin')); await p.goto(BASE + '#/start'); await p.waitForTimeout(200); };

async function collect(p, { gift = true, exchange = 'narrow', morrow = 'take', full = true }) {
  await fresh(p);
  await p.click('[data-r="begin"]'); await p.waitForTimeout(300);
  await p.click('[data-r="dGo"]'); await p.waitForTimeout(300);
  await act(p, 'pass'); await closeWin(p); await next(p);
  await scene(p, 's1');
  await act(p, 'request');
  for (const i of full ? [0, 1, 2, 3] : [0]) await pick(p, '.pk[data-i="' + i + '"]');
  await confirm(p); await closeWin(p);
  await scene(p, 's2'); await act(p, 'status'); await pick(p, '.pk[data-i="0"]'); await confirm(p); await closeWin(p);
  await scene(p, 's3'); await act(p, 'costs'); await pick(p, '.seg[data-i="1"] button[data-k="free"]'); await confirm(p); await closeWin(p);
  await scene(p, 's4'); await act(p, 'bundle'); for (const i of [0, 1, 2, 3]) await pick(p, '.pk[data-i="' + i + '"]'); await confirm(p); await closeWin(p);
  await act(p, 'gift'); await pick(p, '.offer[data-i="0"] .btns2[data-d="' + (gift ? 0 : 2) + '"]'); await closeWin(p);
  await scene(p, 's5'); await act(p, 'offers');
  if (exchange === 'refused') { await pick(p, '.offer[data-i="0"] .btns2[data-d="1"]'); await closeWin(p); }
  else {
    await pick(p, '.offer[data-i="0"] .btns2[data-d="0"]'); await closeWin(p);
    await act(p, 'exchange'); for (const i of exchange === 'narrow' ? [0, 1] : [0, 1, 3]) await pick(p, '.pk[data-i="' + i + '"]'); await confirm(p); await closeWin(p);
  }
  await scene(p, 's5m'); await act(p, 'papers'); await pick(p, '.offer[data-i="0"] .btns2[data-d="' + (morrow === 'take' ? 1 : 2) + '"]'); await closeWin(p);
  await scene(p, 's6'); await act(p, 'block'); await pick(p, '.seg[data-i="0"] button[data-k="free"]'); await confirm(p); await closeWin(p);
  await next(p);
}

async function council(p, plan, { w } = {}) {
  await p.waitForTimeout(300);
  if (await p.isVisible('[data-r="choose"]')) await p.click('[data-r="choose"]');
  await p.click('[data-plan="' + plan + '"]'); await p.waitForTimeout(100);
  if (await p.isVisible('[data-r="supplement"]')) await p.click('[data-r="supplement"]');
  if (plan === 'N') await p.click('[data-r="risk"]');
  if (w) for (const k of ['group', 'method', 'research']) if (!w.includes(k)) await p.uncheck('[data-alloc="' + k + '"]');
  await p.click('[data-r="sign"]'); await p.click('[data-r="yes"]'); await p.waitForTimeout(500);
}

async function afterSign(p, plan, s9) {
  if (plan === 'L' || plan === 'H') {
    await act(p, 'compare'); await p.click('.wf .btnp'); await closeWin(p);
    await act(p, 'cycle'); for (const i of [0, 1, 2]) await pick(p, '.pk[data-i="' + i + '"]'); await confirm(p); await closeWin(p);
    await next(p);
    const idx = { L: { control: 0, research: 1, reserve: 2 }, H: { research: 0, reserve: 1 } }[plan][s9];
    await act(p, 'last'); await pick(p, '.pk[data-i="' + idx + '"]'); await confirm(p); await closeWin(p);
    await next(p);
  } else if (plan === 'N') {
    await act(p, 'line'); await closeWin(p); await act(p, 'advance'); await closeWin(p); await next(p);
  }
}

async function review(p, expectCode, name, { alts: expectAlts = true } = {}) {
  await p.waitForSelector('.where h1'); await p.waitForTimeout(1700);
  const label = await p.textContent('.where .lbl');
  if (!label.includes(expectCode)) throw new Error(name + ': ожидался финал ' + expectCode + ', на экране «' + label + '»');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name + '-final.png' });
  await closeWin(p); await next(p);
  await act(p, 'opps'); if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name + '-opps.png' }); await closeWin(p);
  await act(p, 'alt');
  const alts = await p.$$('[data-alt]');
  if (!expectAlts) {
    if (alts.length) throw new Error(name + ': альтернатив быть не должно');
    if (!(await p.textContent('.wb')).includes('Других решений')) throw new Error(name + ': нет пояснения об отсутствии альтернатив');
    await closeWin(p); return;
  }
  if (!alts.length) throw new Error(name + ': нет альтернатив в разборе');
  await alts[0].click(); await p.waitForTimeout(200);
  if (!(await p.isVisible('.cf'))) throw new Error(name + ': не показано сравнение');
  if (SHOTS) await p.screenshot({ path: SHOTS + '/' + name + '-alt.png' });
  await closeWin(p);
}

const demo = async (p, route) => { await fresh(p); await p.click('[data-r="demo"]'); await p.click('[data-route="' + route + '"]'); };

const ROUTES = {
  'H-research': async (p) => { await collect(p, {}); await council(p, 'H'); await afterSign(p, 'H', 'research'); await review(p, 'S10H', 'H-research'); },
  'L-control': async (p) => { await collect(p, { exchange: 'refused' }); await council(p, 'L'); await afterSign(p, 'L', 'control'); await review(p, 'S10L', 'L-control'); },
  'L-research': async (p) => { await collect(p, { exchange: 'broad', full: false }); await council(p, 'L'); await afterSign(p, 'L', 'research'); await review(p, 'S10R', 'L-research'); },
  N: async (p) => { await collect(p, { gift: false }); await council(p, 'N'); await afterSign(p, 'N'); await review(p, 'S10N', 'N'); },
  W: async (p) => { await collect(p, { gift: false, morrow: 'leave' }); await council(p, 'W', { w: ['group'] }); await review(p, 'S10W', 'W', { alts: false }); },
  'preset-H': async (p) => { await demo(p, 'H'); await council(p, 'H'); await afterSign(p, 'H', 'reserve'); await review(p, 'S10H', 'preset-H'); },
  'preset-L': async (p) => { await demo(p, 'L'); await council(p, 'L'); await afterSign(p, 'L', 'control'); await review(p, 'S10L', 'preset-L'); },
  'preset-N': async (p) => { await demo(p, 'N'); await council(p, 'N'); await afterSign(p, 'N'); await review(p, 'S10N', 'preset-N'); },
  'review-exit-world': async (p) => {
    await demo(p, 'L'); await council(p, 'L'); await afterSign(p, 'L', 'control'); await review(p, 'S10L', 'exit');
    for (const id of ['path', 'note']) {
      await act(p, id);
      if (id === 'note') { for (let i = 0; i < 5; i++) await p.fill('#nf' + i, 'Проверка метода ' + i); await p.click('[data-r="sv"]'); }
      await closeWin(p);
    }
    await next(p); await p.waitForTimeout(300);
    if (!p.url().includes('#/world')) throw new Error('после разбора ожидалась карта мира, адрес ' + p.url());
  },
  'reopen-no-duplicates': async (p) => {
    await fresh(p); await p.click('[data-r="begin"]'); await p.waitForTimeout(200);
    await scene(p, 's4'); await act(p, 'bundle'); for (const i of [0, 1, 2, 3]) await pick(p, '.pk[data-i="' + i + '"]'); await confirm(p); await closeWin(p);
    for (let k = 0; k < 2; k++) { await act(p, 'gift'); await pick(p, '.offer[data-i="0"] .btns2[data-d="0"]'); await closeWin(p); }
    const n = await p.evaluate(() => JSON.parse(localStorage.getItem('afg.insulin')).journal.filter((e) => e.type === 'offer' && e.key === 'gift' && e.value === 'accepted').length);
    if (n !== 2) throw new Error('два нажатия «Принять» дали ' + n + ' записей в журнале');
  },
  's9-once': async (p) => {
    await demo(p, 'L'); await council(p, 'L');
    await act(p, 'compare'); await p.click('.wf .btnp'); await closeWin(p);
    await act(p, 'cycle'); for (const i of [0, 1, 2]) await pick(p, '.pk[data-i="' + i + '"]'); await confirm(p); await closeWin(p);
    await next(p);
    await act(p, 'last'); await pick(p, '.pk[data-i="0"]'); await confirm(p);
    if (await p.isEnabled('.pk[data-i="1"]')) { await pick(p, '.pk[data-i="1"]'); if (await p.isEnabled('.wf .btnp')) await confirm(p); }
    const s9 = await p.evaluate(() => JSON.parse(localStorage.getItem('afg.insulin')).s9);
    if (s9 !== 'control') throw new Error('ожидался выбор control, в состоянии ' + s9);
  },
  'reload-after-sign': async (p) => {
    await demo(p, 'L'); await council(p, 'L');
    await p.reload(); await p.waitForTimeout(500);
    if (!p.url().includes('#/scene/s8')) throw new Error('после перезагрузки ожидался S8, адрес ' + p.url());
    await p.goto(BASE + '#/scene/s4'); await p.waitForTimeout(300);
    if (!p.url().includes('#/scene/s8')) throw new Error('после подписи S4 должен вести на S8, адрес ' + p.url());
  },
};

const only = process.env.ONLY;
const b = await chromium.launch();
let failed = 0;
for (const [w, h] of sizes) {
  for (const [name, run] of Object.entries(ROUTES)) {
    if (only && only !== name) continue;
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    p.on('pageerror', (e) => errs.push(e.message));
    try {
      await run(p);
      if (errs.length) throw new Error('ошибки в консоли: ' + errs.join(' | '));
      console.log('ok   ', w + 'x' + h, name);
    } catch (e) {
      failed++;
      console.log('FAIL ', w + 'x' + h, name, '—', e.message.split('\n')[0]);
      if (SHOTS) await p.screenshot({ path: SHOTS + '/FAIL-' + name + '-' + w + '.png' });
    }
    await ctx.close();
  }
  if (SHOTS) break; // скриншоты только для первого размера
}
await b.close();
process.exit(failed ? 1 : 0);
