/**
 * Low-precision Sun position (spec ECL-01): the Astronomical Almanac's series, as given
 * in Vallado, Fundamentals of Astrodynamics, 4th ed., algorithm 29. Stated accuracy
 * 0.01 deg, 1950 to 2050.
 *
 * The series gives the position in the mean-equator, mean-equinox-of-date frame; it is
 * returned as TEME, which differs from it by nutation (up to about 17 arcseconds), inside
 * the series' own 0.01 deg (36 arcseconds). Time: UTC stands in for UT1 and TT (TT - UTC is 69 s,
 * 0.0008 deg of solar motion). All of this is listed in docs/known-limits.md.
 */
import type { UtcMs } from './time.ts';
import { deg, degToRad, km } from './units.ts';
import { type Vec3, vec3 } from './vectors.ts';

/** Astronomical unit, km. IAU 2012 resolution B2 (exact). */
export const AU_KM = km(149_597_870.7);

const J2000_UTC_MS = Date.UTC(2000, 0, 1, 12);
const MS_PER_JULIAN_CENTURY = 36_525 * 86_400_000;

export function sunPositionTemeKm(t: UtcMs): Vec3<'teme', 'km'> {
  const T = (t - J2000_UTC_MS) / MS_PER_JULIAN_CENTURY;
  const meanLongitudeDeg = 280.46 + 36_000.771 * T;
  const M = degToRad(deg(357.529_109_2 + 35_999.050_34 * T));
  const eclipticLongitude = degToRad(
    deg(meanLongitudeDeg + 1.914_666_471 * Math.sin(M) + 0.019_994_643 * Math.sin(2 * M)),
  );
  const distanceAu = 1.000_140_612 - 0.016_708_617 * Math.cos(M) - 0.000_139_589 * Math.cos(2 * M);
  const obliquity = degToRad(deg(23.439_291 - 0.013_004_2 * T));
  const r = distanceAu * AU_KM;
  return vec3(
    r * Math.cos(eclipticLongitude),
    r * Math.cos(obliquity) * Math.sin(eclipticLongitude),
    r * Math.sin(obliquity) * Math.sin(eclipticLongitude),
  );
}
