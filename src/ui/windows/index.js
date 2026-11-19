/* Типы окон действий. Новый тип: файл с функцией (w, c) и строка здесь.
   c = { root, body, foot, state, done(outcome), msg(outcome) }. done сообщает сцене результат. */
import doc from './doc.js';
import pack from './pack.js';
import choice from './choice.js';
import offers from './offers.js';
import assign from './assign.js';
import match from './match.js';
import calendar from './calendar.js';
import compare from './compare.js';
import help from './help.js';

export const WINDOWS = { doc, pack, choice, offers, assign, match, calendar, compare, help };
export function registerWindow(type, fn) { WINDOWS[type] = fn; }

import { final, timeline, opportunities, causes, facts, counterfactualWin, note } from './review.js';
Object.assign(WINDOWS, { final, timeline, opportunities, causes, facts, counterfactual: counterfactualWin, note });
