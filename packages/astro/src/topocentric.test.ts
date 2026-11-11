import { describe, expect, it } from 'vitest';
import { WGS84_A_KM } from './earth.ts';
import { dopplerShiftHz, lookAngles, station } from './topocentric.ts';
import { deg, degToRad, hz, km, kmPerS, rad, radToDeg } from './units.ts';
import { vec3 } from './vectors.ts';

const equator = station({ latRad: rad(0), lonRad: rad(0), altKm: km(0) });

describe('lookAngles', () => {
  it('puts a satellite straight overhead at 90 deg elevation and its height as range', () => {
    const l = lookAngles(equator, { posEcefKm: vec3(WGS84_A_KM + 500, 0, 0), velEcefKmS: vec3(0, 7.5, 0) });
    expect(radToDeg(l.elevationRad)).toBeCloseTo(90, 9);
    expect(l.rangeKm).toBeCloseTo(500, 9);
    expect(l.rangeRateKmS).toBeCloseTo(0, 12);
  });

  it('measures azimuth from north through east', () => {
    const north = lookAngles(equator, { posEcefKm: vec3(WGS84_A_KM, 0, 1000), velEcefKmS: vec3(0, 0, 0) });
    const east = lookAngles(equator, { posEcefKm: vec3(WGS84_A_KM, 1000, 0), velEcefKmS: vec3(0, 0, 0) });
    expect(radToDeg(north.azimuthRad)).toBeCloseTo(0, 9);
    expect(radToDeg(east.azimuthRad)).toBeCloseTo(90, 9);
    expect(radToDeg(east.elevationRad)).toBeCloseTo(0, 9);
  });

  it('gives a positive range rate for a satellite moving away', () => {
    const l = lookAngles(equator, { posEcefKm: vec3(WGS84_A_KM + 500, 0, 0), velEcefKmS: vec3(1, 0, 0) });
    expect(l.rangeRateKmS).toBeCloseTo(1, 12);
  });

  it('agrees with the geometry of a station at 45 deg N looking at its own zenith', () => {
    const site = station({ latRad: degToRad(deg(45)), lonRad: degToRad(deg(10)), altKm: km(0.2) });
    const up = site.up;
    const p = vec3<'ecef', 'km'>(
      site.posEcefKm.x + 800 * up[0],
      site.posEcefKm.y + 800 * up[1],
      site.posEcefKm.z + 800 * up[2],
    );
    expect(radToDeg(lookAngles(site, { posEcefKm: p, velEcefKmS: vec3(0, 0, 0) }).elevationRad)).toBeCloseTo(
      90,
      9,
    );
  });
});

describe('dopplerShiftHz', () => {
  it('raises an approaching 437 MHz carrier by f0 v / c: 7 km/s gives +10 203.73 Hz', () => {
    // 437e6 * 7 / 299 792.458 = 10 203.7257 Hz.
    expect(dopplerShiftHz(hz(437e6), kmPerS(-7))).toBeCloseTo(10_203.7257, 3);
    expect(dopplerShiftHz(hz(437e6), kmPerS(7))).toBeCloseTo(-10_203.7257, 3);
  });
});
