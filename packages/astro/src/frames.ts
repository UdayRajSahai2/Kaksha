/**
 * Frame transforms: TEME -> ECEF -> geodetic (spec CORE-04).
 *
 * What is ignored, also listed in docs/known-limits.md:
 * - Polar motion: the Earth-fixed frame here is PEF, which differs from ITRF by
 *   a few tenths of an arcsecond (up to about 15 m at the surface).
 * - UT1 - UTC: Earth rotation angle uses UTC in place of UT1.
 * - Length-of-day variation in the Earth rotation rate.
 */
import { WGS84_A_KM, WGS84_E2 } from './earth.ts';
import type { UtcMs } from './time.ts';
import { type Km, km, type Rad, type RadPerS, rad, radPerS } from './units.ts';
import { type Vec3, vec3 } from './vectors.ts';

const TWO_PI = 2 * Math.PI;
const SECONDS_PER_DAY = 86_400;
const MS_PER_DAY = 86_400_000;
const MS_PER_JULIAN_CENTURY = 36_525 * MS_PER_DAY;

/** J2000.0 (JD 2451545.0, 2000-01-01T12:00) on the UTC time line. */
const J2000_UTC_MS = Date.UTC(2000, 0, 1, 12);

export type Geodetic = {
  readonly latRad: Rad;
  readonly lonRad: Rad;
  readonly altKm: Km;
};

export type EcefState = {
  readonly posEcefKm: Vec3<'ecef', 'km'>;
  readonly velEcefKmS: Vec3<'ecef', 'km/s'>;
};

/**
 * Greenwich mean sidereal time, IAU-1982 model, in [0, 2pi).
 * Vallado, Fundamentals of Astrodynamics, 4th ed., sec. 3.5; the same expression as
 * gstime() in Vallado's SGP4 reference code. The model takes UT1;
 * UTC is used in its place (|UT1 - UTC| < 0.9 s, about 13.5 arcseconds of rotation).
 *
 * GMST(s) = 67310.54841 + (876600 h + 8640184.812866 s) T + 0.093104 T^2 - 6.2e-6 T^3,
 * T in Julian centuries from J2000. The 876600 h T term is exactly 86400 s per elapsed day
 * (876600 * 3600 / 36525 = 86400), so modulo one day it is the time since the last 12:00.
 * Taking that from milliseconds keeps microsecond precision; evaluating the large product
 * in float64, as gstime() does, resolves only about 1e-7 s.
 */
export function gmstRad(t: UtcMs): Rad {
  const sinceJ2000Ms = t - J2000_UTC_MS;
  const centuries = sinceJ2000Ms / MS_PER_JULIAN_CENTURY;
  const secondsSinceNoon = (((sinceJ2000Ms % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY) / 1000;
  const seconds =
    67_310.548_41 +
    secondsSinceNoon +
    8_640_184.812_866 * centuries +
    0.093_104 * centuries ** 2 -
    6.2e-6 * centuries ** 3;
  const angle = ((seconds % SECONDS_PER_DAY) / SECONDS_PER_DAY) * TWO_PI;
  return rad(angle < 0 ? angle + TWO_PI : angle);
}

/**
 * Rate of the GMST-1982 angle, the time derivative of gmstRad: about 7.2921158553e-5 rad/s.
 * The velocity transform uses this rather than a nominal Earth rate (WGS-84 gives
 * 7.292115e-5 rad/s) so it is consistent with the rotation it differentiates; the
 * difference, 8.6e-12 rad/s, is 1.9 mm/s at 220 000 km (found by the Skyfield cross-check).
 */
export function gmstRateRadPerS(t: UtcMs): RadPerS {
  const centuries = (t - J2000_UTC_MS) / MS_PER_JULIAN_CENTURY;
  const extraSecondsPerCentury = 8_640_184.812_866 + 2 * 0.093_104 * centuries - 3 * 6.2e-6 * centuries ** 2;
  return radPerS((TWO_PI / SECONDS_PER_DAY) * (1 + extraSecondsPerCentury / (MS_PER_JULIAN_CENTURY / 1000)));
}

/**
 * TEME to Earth-fixed: rotate by GMST about the z axis; velocity also removes
 * the Earth's rotation (v_ecef = R v_teme - omega x r_ecef, omega the GMST rate).
 * Vallado, Fundamentals of Astrodynamics, 4th ed., sec. 3.7 (TEME) with polar motion omitted.
 */
export function temeToEcef(
  posTemeKm: Vec3<'teme', 'km'>,
  velTemeKmS: Vec3<'teme', 'km/s'>,
  t: UtcMs,
): EcefState {
  const theta = gmstRad(t);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const x = cos * posTemeKm.x + sin * posTemeKm.y;
  const y = -sin * posTemeKm.x + cos * posTemeKm.y;
  const omega = gmstRateRadPerS(t);
  return {
    posEcefKm: vec3(x, y, posTemeKm.z),
    velEcefKmS: vec3(
      cos * velTemeKmS.x + sin * velTemeKmS.y + omega * y,
      -sin * velTemeKmS.x + cos * velTemeKmS.y - omega * x,
      velTemeKmS.z,
    ),
  };
}

const MAX_ITERATIONS = 10;
const LAT_TOLERANCE_RAD = 1e-14;

/**
 * Earth-fixed position to WGS-84 geodetic latitude, longitude and height above the ellipsoid.
 * Fixed-point iteration on latitude, converging to 1e-14 rad (well under a micrometre)
 * in a few steps for points from the surface to beyond GEO. The height uses
 * h = p cos(lat) + z sin(lat) - a sqrt(1 - e^2 sin^2(lat)), which stays accurate at the poles.
 */
export function ecefToGeodetic(posEcefKm: Vec3<'ecef', 'km'>): Geodetic {
  const { x, y, z } = posEcefKm;
  const p = Math.hypot(x, y);
  let lat = Math.atan2(z, p * (1 - WGS84_E2));
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const sinLat = Math.sin(lat);
    const n = WGS84_A_KM / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
    const next = Math.atan2(z + WGS84_E2 * n * sinLat, p);
    const done = Math.abs(next - lat) < LAT_TOLERANCE_RAD;
    lat = next;
    if (done) break;
  }
  const sinLat = Math.sin(lat);
  const altKm = p * Math.cos(lat) + z * sinLat - WGS84_A_KM * Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  return { latRad: rad(lat), lonRad: rad(Math.atan2(y, x)), altKm: km(altKm) };
}

/** WGS-84 geodetic coordinates to an Earth-fixed position. Vallado, 4th ed., ch. 3 (site position vector). */
export function geodeticToEcef({ latRad, lonRad, altKm }: Geodetic): Vec3<'ecef', 'km'> {
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const n = WGS84_A_KM / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  return vec3(
    (n + altKm) * cosLat * Math.cos(lonRad),
    (n + altKm) * cosLat * Math.sin(lonRad),
    (n * (1 - WGS84_E2) + altKm) * sinLat,
  );
}
