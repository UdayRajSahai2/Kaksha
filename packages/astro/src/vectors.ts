import type { Km, KmPerS } from './units.ts';

declare const tag: unique symbol;

/**
 * Reference frames used in Earth view.
 * - `teme`: True Equator Mean Equinox, the frame SGP4 outputs.
 * - `ecef`: Earth-fixed. Polar motion is ignored, so strictly this is the
 *   pseudo-Earth-fixed frame (PEF); see docs/known-limits.md.
 */
export type Frame = 'teme' | 'ecef';
export type VectorUnit = 'km' | 'km/s';

/**
 * A Cartesian vector tagged with its frame and unit at compile time, so a TEME
 * vector cannot be passed where an ECEF one is expected (spec CORE-01).
 */
export type Vec3<F extends Frame, U extends VectorUnit> = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly [tag]: readonly [F, U];
};

export function vec3<F extends Frame, U extends VectorUnit>(x: number, y: number, z: number): Vec3<F, U> {
  return { x, y, z } as Vec3<F, U>;
}

export function magnitude<F extends Frame>(v: Vec3<F, 'km'>): Km;
export function magnitude<F extends Frame>(v: Vec3<F, 'km/s'>): KmPerS;
export function magnitude(v: Vec3<Frame, VectorUnit>): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function subtract<F extends Frame, U extends VectorUnit>(a: Vec3<F, U>, b: Vec3<F, U>): Vec3<F, U> {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}
