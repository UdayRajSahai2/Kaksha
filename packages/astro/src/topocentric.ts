/**
 * Ground-station geometry (spec CORE-05): Earth-fixed state to topocentric
 * azimuth, elevation, range and range rate, and the Doppler shift that follows (DOP-01).
 *
 * The station is fixed in the Earth-fixed frame, so the satellite's Earth-fixed velocity
 * is already relative to it. Elevation is geometric: no atmospheric refraction (about
 * 0.5 deg at the horizon, listed in docs/known-limits.md).
 */
import { type EcefState, type Geodetic, geodeticToEcef } from './frames.ts';
import { type Hz, hz, type Km, type KmPerS, km, kmPerS, type Rad, rad } from './units.ts';
import type { Vec3 } from './vectors.ts';

/** Speed of light in vacuum, exact by definition of the metre (SI). */
export const SPEED_OF_LIGHT_KM_S = kmPerS(299_792.458);

export type LookAngles = {
  readonly azimuthRad: Rad;
  readonly elevationRad: Rad;
  readonly rangeKm: Km;
  /** Positive when the satellite moves away from the station. */
  readonly rangeRateKmS: KmPerS;
};

export type Station = {
  readonly geodetic: Geodetic;
  readonly posEcefKm: Vec3<'ecef', 'km'>;
  /** Rows of the Earth-fixed to east-north-up rotation. */
  readonly east: readonly [number, number, number];
  readonly north: readonly [number, number, number];
  readonly up: readonly [number, number, number];
};

export function station(geodetic: Geodetic): Station {
  const { latRad: lat, lonRad: lon } = geodetic;
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);
  return {
    geodetic,
    posEcefKm: geodeticToEcef(geodetic),
    east: [-sinLon, cosLon, 0],
    north: [-sinLat * cosLon, -sinLat * sinLon, cosLat],
    up: [cosLat * cosLon, cosLat * sinLon, sinLat],
  };
}

const dot = (a: readonly [number, number, number], x: number, y: number, z: number) =>
  a[0] * x + a[1] * y + a[2] * z;

/** Azimuth (from north, through east, in [0, 2pi)), elevation, range and range rate. */
export function lookAngles(site: Station, sat: EcefState): LookAngles {
  const dx = sat.posEcefKm.x - site.posEcefKm.x;
  const dy = sat.posEcefKm.y - site.posEcefKm.y;
  const dz = sat.posEcefKm.z - site.posEcefKm.z;
  const e = dot(site.east, dx, dy, dz);
  const n = dot(site.north, dx, dy, dz);
  const u = dot(site.up, dx, dy, dz);
  const range = Math.hypot(dx, dy, dz);
  const az = Math.atan2(e, n);
  const { x: vx, y: vy, z: vz } = sat.velEcefKmS;
  return {
    azimuthRad: rad(az < 0 ? az + 2 * Math.PI : az),
    // Clamped: at the zenith, rounding can put u / range a hair above 1, where asin is NaN.
    elevationRad: rad(Math.asin(Math.max(-1, Math.min(1, u / range)))),
    rangeKm: km(range),
    rangeRateKmS: kmPerS((dx * vx + dy * vy + dz * vz) / range),
  };
}

/**
 * Doppler shift in hertz for a carrier of `frequencyHz`: -f0 * rangeRate / c (first order;
 * the relativistic term is about 1e-10 of f0 in LEO and is ignored).
 */
export function dopplerShiftHz(frequencyHz: Hz, rangeRateKmS: KmPerS): Hz {
  return hz((-frequencyHz * rangeRateKmS) / SPEED_OF_LIGHT_KM_S);
}
