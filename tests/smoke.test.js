import { describe, it, expect } from 'vitest';
import { parseHash } from '../src/ui/router.js';

describe('parseHash', () => {
  it('разбирает адрес сцены', () => {
    expect(parseHash('#/scene/s3')).toEqual({ name: 'scene', id: 's3' });
  });
  it('пустой адрес ведёт на старт', () => {
    expect(parseHash('')).toEqual({ name: 'start' });
  });
  it('адрес без параметра', () => {
    expect(parseHash('#/council')).toEqual({ name: 'council' });
  });
});
