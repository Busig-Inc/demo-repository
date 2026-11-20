/* Портреты персонажей: файл и точка кадрирования.
   Все портреты 600×750, а рамки в игре уже и выше (арка в окне диалога, аватарка на карте).
   x — горизонтальная позиция картинки в процентах (CSS background-position-x): при ней лицо
   встаёт в середину узкой арки. 50 — по центру, 100 — картинка прижата правым краем.
   Подобрано по сетке на портретах: у большинства лицо правее центра. */
export const PORTRAITS = {
  archivist: { file: 'img/portraits/archivist.jpg', x: 78 },
  bunting: { file: 'img/portraits/bunting.jpg', x: 68 },
  close: { file: 'img/portraits/close.jpg', x: 97 },
  defries: { file: 'img/portraits/defries.jpg', x: 92 },
  macleod: { file: 'img/portraits/macleod.jpg', x: 80 },
  marta: { file: 'img/portraits/marta.jpg', x: 100 },
  morrow: { file: 'img/portraits/morrow.jpg', x: 100 },
  scott: { file: 'img/portraits/scott.jpg', x: 57 },
  weil: { file: 'img/portraits/weil.jpg', x: 100 },
};

/* Как персонажа называют в карточках мест на карте Торонто. */
const BY_NAME = {
  'Архивариус': 'archivist', 'Бантинг': 'bunting', 'Клоуз': 'close', 'Дефриз': 'defries',
  'Маклеод': 'macleod', 'Марта': 'marta', 'Морроу': 'morrow', 'Скотт': 'scott', 'Вейл': 'weil',
};

const keyOf = (file) => Object.keys(PORTRAITS).find((k) => file && file.endsWith('/' + k + '.jpg'));

/* Позиция по горизонтали для файла портрета, в процентах. */
export const focusX = (file) => (keyOf(file) ? PORTRAITS[keyOf(file)].x : 50);

/* Инлайн-стиль маленькой квадратной аватарки: крупный план лица. */
export function avatarStyle(name) {
  const p = PORTRAITS[BY_NAME[name]];
  if (!p) return '';
  return ' style="background:url(' + p.file + ') ' + p.x + '% 28%/180% auto no-repeat var(--panel-2)"';
}
