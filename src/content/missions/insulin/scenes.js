/* Сцены миссии «Инсулин». Тексты, окна и цифры лежат в mission.data.js (перенесено из дизайн-пакета, правится там).
   Здесь только поведение:
   - effect(outcome) — что меняется в состоянии, когда игрок подтверждает окно (outcome = {ok, value});
   - when(state) / whenHint — когда действие доступно и что сделать, чтобы его открыть;
   - msg(outcome) — свой текст результата, если стандартного okMsg/partMsg мало;
   - next — куда ведёт главная кнопка (адрес экрана или функция от состояния);
   - links — дополнительные переходы.
   Адреса экранов: 'city', 'council', 'final', 'scene/<id>'. */
import data from './mission.data.js';

const base = data.scenes;
const toCity = { label: 'Вернуться на карту Торонто', href: 'city' };

/* Сцена из пакета с заменой отдельных действий и полей. */
function scene(id, patch) {
  const src = structuredClone(base[id]);
  const actions = src.actions.map((a) => ({ ...a, ...(patch.actions?.[a.id] || {}) }));
  const extra = patch.extraActions || [];
  return { ...src, ...patch, id, actions: [...actions, ...extra], next: patch.next || toCity };
}

const doc = (id) => ({ type: 'doc', id });
const has = (o, i) => o.value.includes(i);

export const scenes = {
  s0: scene('s0', {
    actions: {
      pass: { effect: () => doc('pass') },
      agree: { effect: () => doc('agreements') },
    },
    next: { label: 'Перейти на карту Торонто', href: 'city' },
  }),

  s1: scene('s1', {
    actions: {
      journal: { effect: () => doc('journal') },
      request: { effect: (o) => [{ type: 'request', full: o.ok }, doc('request'), doc('letter27')] },
    },
  }),

  s2: scene('s2', {
    actions: {
      status: { effect: (o) => ({ type: 'hospital', status: o.ok ? 'honest' : 'overpromise' }) },
    },
  }),

  s3: scene('s3', {
    actions: {
      costs: { effect: () => doc('costs') },
      memo: { effect: () => doc('memo') },
    },
    links: [{ label: 'Позвонить Клоузу', hint: 'Lilly, Индианаполис', href: 'scene/s5' }],
  }),

  s4: scene('s4', {
    actions: {
      bundle: { effect: (o) => (o.ok ? [doc('bundle'), { type: 'offer', key: 'gift', value: 'seen' }] : []) },
      gift: {
        when: (s) => s.offers.gift !== 'none',
        whenHint: 'Сначала отправьте полный пакет',
        // Решения карточки: 0 принять, 1 спросить о свободном использовании, 2 отказаться.
        effect: (o) => [
          [{ type: 'offer', key: 'gift', value: 'accepted' }, doc('gift')],
          [],
          { type: 'offer', key: 'gift', value: 'declined' },
        ][o.value.decision],
      },
    },
    links: [{ label: 'Поговорить с Морроу', hint: 'Заказ с оплатой после результата', href: 'scene/s5m' }],
  }),

  s5: (() => {
    const s = scene('s5', {
      actions: {
        offers: {
          // Карточка 0 — совместная проверка, карточка 1 — пилот (следующая версия).
          // Взять приложение после отказа можно: до совета переговоры не закрыты.
          effect: (o, st) => {
            const { card, decision } = o.value;
            if (card === 1) return { type: 'offer', key: 'pilot', value: 'seen' };
            if (decision === 1) return { type: 'offer', key: 'exchange', value: 'refused' };
            return st?.offers.exchange === 'refused' ? [doc('annexCheck'), { type: 'offer', key: 'exchange', value: 'none' }] : doc('annexCheck');
          },
        },
        exchange: {
          when: (st) => st.offers.exchange !== 'refused' && st.folder.includes('annexCheck'),
          whenHint: 'Сначала возьмите предложение Lilly',
          effect: (o) => {
            const broad = has(o, 2) || has(o, 3);
            const full = has(o, 0) && has(o, 1);
            if (broad) return { type: 'offer', key: 'exchange', value: 'broad' };
            if (full) return [{ type: 'offer', key: 'exchange', value: 'narrow' }, doc('exchange')];
            return [];
          },
          msg: (o) => (!has(o, 2) && !has(o, 3) && !(has(o, 0) && has(o, 1))
            ? 'Клоузу нужны и данные этапа, и метод измерения. Добавьте недостающее.'
            : null),
        },
      },
      links: [{ label: 'Вернуться в кабинет', hint: 'Дефриз', href: 'scene/s3' }],
    });
    // Пилот P появится в следующей версии. В MVP карточку не показываем, данные остаются в mission.data.js.
    const w = s.actions.find((a) => a.id === 'offers').window;
    w.cards = w.cards.slice(0, 1);
    return s;
  })(),

  s5m: (() => {
    const s = scene('s5m', {
      actions: {
        papers: {
          // Карточка 0 — N: 0 раскрыть расчёт, 1 взять в папку, 2 оставить неподписанной. Карточка 1 — F.
          effect: (o) => {
            const { card, decision } = o.value;
            if (card === 1) return { type: 'offer', key: 'morrowF', value: 'seen' };
            return [
              { type: 'offer', key: 'morrowN', value: 'seen' },
              [{ type: 'offer', key: 'morrowN', value: 'taken' }, doc('morrowN')],
              { type: 'offer', key: 'morrowN', value: 'declined' },
            ][decision];
          },
        },
        line: { effect: () => [] },
      },
    });
    const cards = s.actions.find((a) => a.id === 'papers').window.cards;
    const [reveal, leave] = cards[0].decisions;
    cards[0].decisions = [reveal, { t: 'Взять в папку', res: 'Бумага Морроу в папке. Подписать её можно только на совете, с отдельным разрешением рискнуть деньгами Connaught.' }, leave];
    // Бронь F появится в следующей версии. В MVP карточку не показываем, данные остаются в mission.data.js.
    cards.length = 1;
    return s;
  })(),

  s6: scene('s6', {
    actions: {
      block: { effect: (o) => (Object.values(o.value).includes('free') ? { type: 'research' } : []) },
    },
    next: { label: 'К заседанию совета', href: 'council' },
    links: [{ label: 'Карта Торонто', hint: 'Можно вернуться к поиску', href: 'city' }],
  }),

  s8: scene('s8', {
    back: null,
    actions: {
      compare: { effect: () => ({ type: 's8', step: 'compared' }) },
      cycle: {
        when: (s) => s.s8.compared,
        whenHint: 'Сначала сравните две проверки',
        done: (s) => s.s8.cycle, // неполный цикл не считается выполненным
        effect: (o) => (o.ok ? { type: 's8', step: 'cycle' } : []),
      },
    },
    next: { label: 'Кто оплатит повторную проверку', href: 'scene/s9' },
  }),

  s9: (state) => (state.plan === 'H' ? s9H : s9L),

  s8n: {
    id: 's8n',
    bg: 'site',
    label: 'Торонто · Счёт перед отправкой',
    title: 'Счёт перед отправкой',
    back: null,
    speaker: { name: 'Абель Морроу', role: 'Торговый агент (вымышленный)', portrait: 'img/portraits/morrow.jpg' },
    lines: ['Поставщик получил ваши 3 и собирает аппарат. Перед отправкой ему нужна ещё 1. Покупатель платит только после приёмки, раньше я ничего не могу.'],
    topics: [
      { t: 'Поможет ли дар', a: 'Дар только на аппарат, людей он не оплатит. А свободных денег у вас 0.' },
    ],
    ctx: null,
    actions: [
      {
        id: 'line', label: 'Календарь платежей', hint: 'Что стоит до приёмки',
        window: {
          type: 'calendar', title: 'Работы до приёмки', weeks: 8,
          works: [['Сборка, без возврата', 1, 3, 'paid', 3], ['Остаток покупки', 3, 4, 'late', 1], ['Освоение', 4, 6, 'late', 1], ['Первая проверка', 6, 7, 'late', 1], ['Обещанные 8 после приёмки', 7, 9, 'wait', 8]],
          note: 'Остаток покупки 1, освоение 1 и первая проверка 1 стоят до приёмки. Обещанные 8 придут только после неё.',
        },
        effect: () => [],
      },
      {
        id: 'advance', label: 'Запросить аванс', hint: 'У покупателя',
        window: { type: 'doc', title: 'Ответ покупателя', mark: 'game', paras: ['Покупатель отказывается менять условие. Платёж только после приёмки.', 'Денег этот запрос не вернул. Зато видно, чего не хватает.'] },
        effect: () => ({ type: 's8n', step: 'advance' }),
      },
      {
        id: 'refund', label: 'Попросить возврат', hint: 'У поставщика',
        window: { type: 'doc', title: 'Ответ поставщика', mark: 'game', paras: ['Поставщик присылает акт начатой сборки. По договору 3 не возвращаются.', 'Освоение и исследование сняты с календаря. Свободных денег 0.'] },
        effect: () => ({ type: 's8n', step: 'refund' }),
      },
    ],
    required: ['line'],
    next: { label: 'К финалу', href: 'final', effect: { type: 's8n', step: 'done' } },
  },
};

const s9Common = {
  id: 's9', bg: 'site', back: null, label: 'Торонто · Повторная проверка',
  title: 'Последняя свободная единица', ctx: null,
  next: { label: 'К финалу', href: 'final' },
};

const s9L = {
  ...s9Common,
  speaker: { name: 'Дэвид Скотт', role: 'Отвечает за аппараты и методы', portrait: 'img/portraits/scott.jpg' },
  lines: ['Повторная проверка стоит 1. Свободная единица у нас одна, и она отложена на исследование Маклеода. Решай, Чарли.'],
  topics: [
    { t: 'Что скажет Маклеод', a: 'Поймёт. Попросит только записать, из каких денег потом вернём его опыт.' },
    { t: 'Что скажет Бантинг', a: 'Спросит, точно ли наука сейчас важнее. Если оставишь исследование, врачам дату пока не назовём.' },
  ],
  actions: [{
    id: 'last', label: 'Отдать последнюю единицу', hint: 'Одну единицу нельзя потратить дважды',
    window: {
      type: 'choice', title: 'Последняя свободная единица',
      intro: 'Повторная проверка стоит 1, исследование Маклеода тоже 1. Свободна одна единица.',
      options: [
        { t: 'Оплатить повторную проверку', h: 'Исследование переносится', good: true, value: 'control', fb: 'Проверка оплачена. Исследование Маклеода перенесено, его записи сохранены.' },
        { t: 'Сохранить исследование', h: 'Новую партию пока не примут', good: true, value: 'research', fb: 'Исследование оплачено. Новую партию не примут, пока не оплачена повторная проверка.' },
        { t: 'Оставить единицу в резерве', h: 'Обе работы ждут', good: true, value: 'reserve', fb: 'Единица осталась у Connaught. Проверка и исследование ждут следующего этапа.' },
      ],
      confirm: 'Подтвердить', once: true,
    },
    when: (s) => !s.s9, whenHint: 'Выбор сделан, он идёт в финал',
    effect: (o) => ({ type: 's9', choice: o.value }),
  }],
  required: ['last'],
};

const s9H = {
  ...s9Common,
  speaker: { name: 'Дэвид Скотт', role: 'Отвечает за аппараты и методы', portrait: 'img/portraits/scott.jpg' },
  lines: ['Lilly провела повторную проверку по общему эталону, числа сошлись. Теперь отдаём им все записи этого этапа, и неудачные тоже. Свободная единица у нас осталась.'],
  topics: [
    { t: 'Что уходит в Lilly', a: 'Данные этого этапа и метод. Исследование Маклеода остаётся у нас.' },
  ],
  actions: [{
    id: 'last', label: 'Последняя свободная единица', hint: 'Проверку сделала Lilly',
    window: {
      type: 'choice', title: 'Последняя свободная единица',
      intro: 'Проверку сделала Lilly, деньги Connaught на неё не ушли. Свободна одна единица.',
      options: [
        { t: 'Направить на исследование Маклеода', h: 'Первый опыт в этой стадии', good: true, value: 'research', fb: 'Исследование оплачено. Маклеод начинает первый опыт.' },
        { t: 'Оставить в резерве', h: 'Исследование ждёт', good: true, value: 'reserve', fb: 'Единица осталась у Connaught. Исследование ждёт следующего этапа.' },
      ],
      confirm: 'Подтвердить', once: true,
    },
    when: (s) => !s.s9, whenHint: 'Выбор сделан, он идёт в финал',
    effect: (o) => ({ type: 's9', choice: o.value }),
  }],
  required: ['last'],
};

/* Документы, которые попадают в папку. mark: archive — архивный, game — из игры. */
export const docs = {
  pass: { t: 'Записная книжка Беста', h: 'Кто я, цель, деньги', mark: 'game' },
  agreements: { t: 'Действующие соглашения', h: 'Меморандум и договор с Lilly', mark: 'archive' },
    letter27: { t: 'Письмо Бантинга от 27 июля', h: 'Пересказ письма об аппарате у Lilly', mark: 'archive' },
  request: { t: 'Список для Бантинга', h: 'Что просим и на что', mark: 'game' },
  costs: { t: 'Расходы по работам', h: 'Резерв 3, работ на 7', mark: 'game' },
  memo: { t: 'Январский меморандум', h: 'Копия от Дефриза', mark: 'archive' },
  bundle: { t: 'Письмо благотворителю', h: 'Счёт, план установки, учреждение', mark: 'game' },
  gift: { t: 'Предложение Элеоноры Вейл', h: '4 целевые на аппарат', mark: 'game' },
  annexCheck: { t: 'Предложение Lilly', h: 'Одна повторная проверка их силами', mark: 'game' },
  exchange: { t: 'Что отдаём Lilly', h: 'Данные этапа и метод', mark: 'game' },
  morrowN: { t: 'Бумага Морроу', h: '8 после приёмки, аванс 3 сейчас', mark: 'game' },
};
