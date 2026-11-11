/**
 * Eclipses (spec ECL-01, ECL-02): when a satellite is in the Earth's shadow.
 *
 * Model: the cylindrical shadow. The Earth's shadow is a cylinder of the equatorial radius
 * along the anti-Sun direction; there is no penumbra and the Earth is a sphere here.
 * Vallado, Fundamentals of Astrodynamics, 4th ed., sec. 5.3. Limits (docs/known-limits.md):
 * entry and exit are sharp instead of spread over the 10 to 20 s of penumbra in LEO; the
 * conical model is the refinement.
 */
import { WGS84_A_KM } from './earth.ts';
import { bisect } from './roots.ts';
import { propagateTeme, type Sgp4Satellite } from './sgp4.ts';
import { sunPositionTemeKm } from './sun.ts';
import { type UtcMs, utcMs } from './time.ts';
import type { Vec3 } from './vectors.ts';

/**
 * Positive when sunlit, negative in shadow, zero on the shadow boundary; continuous, so its
 * sign changes can be bracketed. Behind the Earth it is the distance from the shadow axis
 * minus the shadow radius; on the day side, the distance from the Earth's centre minus it.
 */
export function shadowMarginKm(posTemeKm: Vec3<'teme', 'km'>, sunTemeKm: Vec3<'teme', 'km'>): number {
  const sunNorm = Math.hypot(sunTemeKm.x, sunTemeKm.y, sunTemeKm.z);
  const sx = sunTemeKm.x / sunNorm;
  const sy = sunTemeKm.y / sunNorm;
  const sz = sunTemeKm.z / sunNorm;
  const along = posTemeKm.x * sx + posTemeKm.y * sy + posTemeKm.z * sz;
  const r = Math.hypot(posTemeKm.x, posTemeKm.y, posTemeKm.z);
  if (along >= 0) return r - WGS84_A_KM;
  const fromAxis = Math.sqrt(Math.max(0, r * r - along * along));
  return fromAxis - WGS84_A_KM;
}

export function isSunlit(posTemeKm: Vec3<'teme', 'km'>, t: UtcMs): boolean {
  return shadowMarginKm(posTemeKm, sunPositionTemeKm(t)) > 0;
}

export type EclipseInterval = {
  /** Null when the window opens with the satellite already in shadow. */
  readonly entry: UtcMs | null;
  /** Null when the window closes with the satellite still in shadow. */
  readonly exit: UtcMs | null;
};

/**
 * Shadow intervals between `from` and `to`: a coarse step, then bisection to `toleranceMs`.
 * A shadow pass shorter than the step can be missed; in LEO they last 20 minutes or more
 * except near the edge of the eclipse season.
 */
export function eclipseIntervals(
  satellite: Sgp4Satellite,
  from: UtcMs,
  to: UtcMs,
  stepS = 30,
  toleranceMs = 100,
): EclipseInterval[] {
  const margin = (t: number) => {
    const s = propagateTeme(satellite, utcMs(t));
    return s.ok ? shadowMarginKm(s.state.posTemeKm, sunPositionTemeKm(utcMs(t))) : Number.NaN;
  };
  const intervals: EclipseInterval[] = [];
  let prevT = Number(from);
  let prev = margin(prevT);
  let inShadow = prev < 0;
  let open: UtcMs | null = inShadow ? from : null;
  while (prevT < to) {
    const t = Math.min(prevT + stepS * 1000, Number(to));
    const value = margin(t);
    if (!Number.isNaN(value) && !Number.isNaN(prev) && value < 0 !== inShadow) {
      const edge = utcMs(bisect(margin, prevT, t, toleranceMs));
      if (inShadow) intervals.push({ entry: open, exit: edge });
      open = inShadow ? null : edge;
      inShadow = !inShadow;
    }
    prevT = t;
    prev = value;
  }
  if (inShadow) intervals.push({ entry: open, exit: null });
  return intervals;
}
