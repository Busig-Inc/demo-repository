/* Места на карте Торонто и точка миссии на карте мира. Координаты в процентах от картинки (из пакета). */
import data from './mission.data.js';

const HREF = { 's1.html': 'scene/s1', 's2.html': 'scene/s2', 's3.html': 'scene/s3', 's4.html': 'scene/s4', 's6.html': 'scene/s6', 'экран_план.html': 'council' };

export const places = data.places.map((p) => ({ ...p, href: HREF[p.href] || p.href }));
export const world = data.world;
