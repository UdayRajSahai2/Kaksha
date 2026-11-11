import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { deg, degToRad, rad, radToDeg } from './units.ts';

describe('angle conversion', () => {
  it('maps 180 degrees to pi radians (definition)', () => {
    expect(degToRad(deg(180))).toBe(Math.PI);
    expect(radToDeg(rad(Math.PI))).toBe(180);
  });

  it('refuses radians where degrees are expected (checked by pnpm typecheck)', () => {
    // @ts-expect-error a Rad is not a Deg
    expect(degToRad(rad(1))).toBeTypeOf('number');
  });

  it('round-trips degrees to within 1e-12 degrees', () => {
    fc.assert(
      fc.property(fc.double({ min: -720, max: 720, noNaN: true }), (value) => {
        expect(radToDeg(degToRad(deg(value)))).toBeCloseTo(value, 12);
      }),
    );
  });
});
