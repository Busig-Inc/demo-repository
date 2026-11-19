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
    links: [{ label: 'Позвонить Клоузу', hint: 'S5 · Индианаполис', href: 'scene/s5' }],
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
    links: [{ label: 'Карточка Морроу', hint: 'S5M · по желанию', href: 'scene/s5m' }],
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
          whenHint: 'Сначала возьмите приложение о совместной проверке',
          effect: (o) => {
            const broad = has(o, 2) || has(o, 3);
            const full = has(o, 0) && has(o, 1);
            if (broad) return { type: 'offer', key: 'exchange', value: 'broad' };
            if (full) return [{ type: 'offer', key: 'exchange', value: 'narrow' }, doc('exchange')];
            return [];
          },
          msg: (o) => (!has(o, 2) && !has(o, 3) && !(has(o, 0) && has(o, 1))
            ? 'Клоузу нужны и данные общего этапа, и метод измерения, чтобы поставить числа рядом. Добавьте недостающее.'
            : null),
        },
      },
      links: [{ label: 'Вернуться в кабинет', hint: 'S3', href: 'scene/s3' }],
    });
    // Пилот P появится в следующей версии: карточку можно изучить, но не взять.
    const pilot = s.actions.find((a) => a.id === 'offers').window.cards[1];
    pilot.next = true;
    pilot.decisions = [{ t: 'Сравнить с совместной проверкой', res: 'Ресурсы партнёра с эквивалентом 6, аппарат остаётся у него, доступ на один пилотный период. Этот маршрут появится в следующей версии.' }];
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
    cards[0].decisions = [reveal, { t: 'Взять в рабочую папку', res: 'Бумага N в папке. Подписать её можно только в совете, вместе с отдельным разрешением рискнуть резервом.' }, leave];
    cards[1].next = true;
    cards[1].decisions = [cards[1].decisions[0]];
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
        whenHint: 'Сначала наложите отчёты',
        done: (s) => s.s8.cycle, // неполный цикл не считается выполненным
        effect: (o) => (o.ok ? { type: 's8', step: 'cycle' } : []),
      },
    },
    next: { label: 'К последнему месту в календаре', href: 'scene/s9' },
  }),

  s9: (state) => (state.plan === 'H' ? s9H : s9L),

  s8n: {
    id: 's8n',
    bg: 'site',
    label: 'Миссия «Инсулин» · S8N · Счёт до отправки',
    title: 'Счёт до отправки',
    back: null,
    speaker: { name: 'Абель Морроу', role: 'Торговый представитель', portrait: 'img/portraits/morrow.jpg' },
    lines: ['Поставщик подтверждает, что принял 3 и начал комплектацию. Теперь он требует остаток 1 до отправки. Вы открываете казну: в ней 0. «Заказчик рассчитается после приёмки. Я не могу принять за него другое обязательство».'],
    topics: [
      { t: 'Хватит ли целевой помощи', a: 'Даже целевая покупочная помощь сама по себе не оплатит людей, когда свободный резерв уже потрачен. Нового свободного поступления в этот цикл не подтверждено.' },
    ],
    ctx: null,
    actions: [
      {
        id: 'line', label: 'Линейка работ', hint: 'Что стоит до приёмки',
        window: {
          type: 'calendar', title: 'Работы до приёмки', weeks: 8,
          works: [['Комплектация, невозвратно', 1, 3, 'paid', 3], ['Остаток покупки', 3, 4, 'late', 1], ['Освоение', 4, 6, 'late', 1], ['Первая оценка', 6, 7, 'late', 1], ['Обещанные 8 после приёмки', 7, 9, 'wait', 8]],
          note: 'Последовательно появляются остаток покупки 1, освоение 1 и первая оценка 1. До этих работ приёмка недоступна, обещанные 8 остаются за ней.',
        },
        effect: () => [],
      },
      {
        id: 'advance', label: 'Запросить аванс', hint: 'У заказчика Морроу',
        window: { type: 'doc', title: 'Ответ заказчика', mark: 'game', paras: ['Заказчик отказывает в изменении уже заключённого условия. Расчёт по-прежнему после приёмки.', 'Действие показывает, чего именно не хватает для спасения. Деньги оно не восстанавливает.'] },
        effect: () => ({ type: 's8n', step: 'advance' }),
      },
      {
        id: 'refund', label: 'Попросить возврат', hint: 'У поставщика',
        window: { type: 'doc', title: 'Ответ поставщика', mark: 'game', paras: ['Поставщик присылает акт начатой комплектации и ссылается на согласованную невозвратность 3.', 'Дефриз снимает с календаря освоение и исследовательский блок: «Они ничего не нарушили. Неподтверждённые деньги были у нас в плане раньше, чем могли появиться на счёте».'] },
        effect: () => ({ type: 's8n', step: 'refund' }),
      },
    ],
    required: ['line'],
    next: { label: 'К финалу', href: 'final', effect: { type: 's8n', step: 'done' } },
  },
};

const s9Common = {
  id: 's9', bg: 'site', back: null, label: 'Миссия «Инсулин» · S9 · Последнее место',
  title: 'Последнее свободное место в календаре', ctx: null,
  next: { label: 'К финалу', href: 'final' },
};

const s9L = {
  ...s9Common,
  speaker: { name: 'Дэвид Скотт', role: 'Методы производства', portrait: 'img/portraits/scott.jpg' },
  lines: ['Нужно ещё одно сравнение. От того, что нас ждут к четвергу, числа одинаковыми не станут. Свободная единица осталась одна, и её уже занимал исследовательский блок Маклеода.'],
  topics: [
    { t: 'Что будет, если перенести исследование', a: 'Маклеод получит уведомление о переносе. За ним сохранят записи и право продолжить работу в будущем.' },
    { t: 'Что будет, если перенести этап', a: 'Аппарат останется у Connaught, но новый объём не будет подтверждён, пока не оплатим общее сравнение.' },
  ],
  actions: [{
    id: 'last', label: 'Занять последнюю единицу', hint: 'Одну единицу нельзя списать дважды',
    window: {
      type: 'choice', title: 'Последняя свободная единица',
      intro: 'Дополнительный контроль стоит 1, исследование Маклеода тоже 1. Свободна одна единица.',
      options: [
        { t: 'Оплатить дополнительный контроль', h: 'Исследование переносится', good: true, value: 'control', fb: 'Маклеод смотрит на даты: «Понимаю. Поставьте рядом, откуда возьмём время в следующем периоде». В папке появляется неоплаченная будущая задача.' },
        { t: 'Сохранить исследование', h: 'Подтверждение этапа переносится', good: true, value: 'research', fb: 'Бантинг смотрит на переставленные карточки: «Ты уверен, что сейчас это важнее? Тогда я скажу, что нового подтверждённого объёма пока не будет».' },
        { t: 'Оставить единицу в резерве', h: 'Обе работы ждут', good: true, value: 'reserve', fb: 'Единица остаётся у Connaught. Контроль и исследование ждут следующего периода.' },
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
  speaker: { name: 'Дэвид Скотт', role: 'Методы производства', portrait: 'img/portraits/scott.jpg' },
  lines: ['Общая проверка уже в приложении, партнёр делает её в натуре. Клоуз прислал сотрудника, который сверит общую контрольную основу. «Теперь нужно отдать им все записи этого сравнения. Включая неудачные».'],
  topics: [
    { t: 'Что уходит партнёру', a: 'Пакет общего этапа: данные и метод. Собственная записка Маклеода остаётся в отдельной папке.' },
  ],
  actions: [{
    id: 'last', label: 'Последняя свободная единица', hint: 'Контроль уже оплачен партнёром',
    window: {
      type: 'choice', title: 'Последняя свободная единица',
      intro: 'Контроль проходит по принятому приложению и из резерва ничего не списывает. Свободна одна единица Connaught.',
      options: [
        { t: 'Направить на исследование Маклеода', h: 'Первый опыт в этой стадии', good: true, value: 'research', fb: 'Исследовательский шаг сохраняется в этой стадии. Маклеод получает время на постановку и первый опыт.' },
        { t: 'Оставить в резерве', h: 'Вопрос остаётся неоплаченным', good: true, value: 'reserve', fb: 'Остаток увеличивается, записка Маклеода остаётся в папке будущих работ.' },
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
  pass: { t: 'Пропуск Чарльза Беста', h: 'Нынешние обязанности', mark: 'game' },
  agreements: { t: 'Действующие соглашения', h: 'Меморандум и договор с Lilly', mark: 'archive' },
  journal: { t: 'Журнал образцов', h: 'Номера сверены с записями', mark: 'game' },
  letter27: { t: 'Письмо Бантинга от 27 июля', h: 'Пересказ: аппарат у Lilly', mark: 'archive' },
  request: { t: 'Запрос на поддержку', h: 'Что просим и на что', mark: 'game' },
  costs: { t: 'Расходы по работам', h: 'Резерв 3, работ на 7', mark: 'game' },
  memo: { t: 'Январский меморандум', h: 'Копия от Дефриза', mark: 'archive' },
  bundle: { t: 'Отправление благотворителю', h: 'Счёт, план установки, учреждение', mark: 'game' },
  gift: { t: 'Предложение Элеоноры Вейл', h: '4 целевые на аппарат', mark: 'game' },
  annexCheck: { t: 'Приложение о совместной проверке', h: 'Одна работа в натуре', mark: 'game' },
  exchange: { t: 'Перечень обмена с границами', h: 'Данные общего этапа и метод', mark: 'game' },
  morrowN: { t: 'Бумага Морроу N', h: '8 после приёмки, аванс 3', mark: 'game' },
};
