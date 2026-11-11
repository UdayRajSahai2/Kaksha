import { sunPos } from 'satellite.js';
import { describe, expect, it } from 'vitest';
import { AU_KM, sunPositionTemeKm } from './sun.ts';
import { julianDateFromUtcMs, utcMsFromDate } from './time.ts';
import { magnitude } from './vectors.ts';

const at = (iso: string) => utcMsFromDate(new Date(iso));
const declinationDeg = (iso: string) => {
  const s = sunPositionTemeKm(at(iso));
  return (Math.asin(s.z / magnitude(s)) * 180) / Math.PI;
};

// Event times: US Naval Observatory, "Earth's Seasons and Apsides" (2024).
describe('sunPositionTemeKm (Astronomical Almanac series, 0.01 deg)', () => {
  it('has zero declination at the March equinox, 2024-03-20 03:06 UTC (to 0.02 deg)', () => {
    expect(Math.abs(declinationDeg('2024-03-20T03:06:00Z'))).toBeLessThan(0.02);
  });

  it('has declination equal to the obliquity, 23.44 deg, at the June solstice, 2024-06-20 20:51 UTC', () => {
    expect(Math.abs(declinationDeg('2024-06-20T20:51:00Z') - 23.44)).toBeLessThan(0.02);
  });

  it('is 0.98330 AU away at perihelion, 2024-01-03 00:39 UTC (to 0.0001 AU)', () => {
    expect(Math.abs(magnitude(sunPositionTemeKm(at('2024-01-03T00:39:00Z'))) / AU_KM - 0.983_3)).toBeLessThan(
      1e-4,
    );
  });

  it('agrees in direction with satellite.js sunPos to the series accuracy, 0.01 deg', () => {
    // satellite.js uses Vallado 5th-edition coefficients (36000.77, 357.5277233); Kaksha the
    // Astronomical Almanac / 4th-edition ones (36000.771, 357.5291092). Both claim 0.01 deg.
    for (const iso of ['2000-01-01T12:00:00Z', '2026-11-11T00:00:00Z', '2006-06-25T19:46:43Z']) {
      const t = at(iso);
      const ours = sunPositionTemeKm(t);
      const ref = sunPos(julianDateFromUtcMs(t)).rsun;
      const cos =
        (ours.x * ref.x + ours.y * ref.y + ours.z * ref.z) /
        (magnitude(ours) * Math.hypot(ref.x, ref.y, ref.z));
      expect((Math.acos(Math.min(1, cos)) * 180) / Math.PI).toBeLessThan(0.01);
    }
  });
});
