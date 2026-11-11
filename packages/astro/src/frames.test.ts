import fc from 'fast-check';
import { eciToEcf, eciToGeodetic, gstime } from 'satellite.js';
import { describe, expect, it } from 'vitest';
import { WGS84_A_KM, WGS84_B_KM } from './earth.ts';
import { ecefToGeodetic, geodeticToEcef, gmstRad, temeToEcef } from './frames.ts';
import { propagateTeme, satelliteFromTle } from './sgp4.ts';
import { julianDateFromUtcMs, type UtcMs, utcMs, utcMsFromDate } from './time.ts';
import { deg, degToRad, km, rad, radToDeg } from './units.ts';
import { magnitude, subtract, vec3 } from './vectors.ts';

const at = (iso: string) => utcMsFromDate(new Date(iso));

/** Smallest signed difference between two angles, in (-pi, pi]. */
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

const instant = fc.integer({ min: Date.UTC(1957, 0, 1), max: Date.UTC(2100, 0, 1) });

describe('gmstRad (IAU-1982)', () => {
  it('matches Vallado example 3-5: 1992-08-20 12:14 UT1 is 152.578787810 deg (to 1e-7 deg)', () => {
    // The example is posed in UT1; it is passed as UTC here. Evaluating the expression at
    // exactly 12:14:00 gives 152.5787878517 deg, 4.2e-8 deg (10 microseconds) from the printed
    // value; that is the time resolution of a float64 Julian date, which the reference
    // computation takes as input. Checked to 1e-7 deg (24 microseconds).
    expect(Math.abs(radToDeg(gmstRad(at('1992-08-20T12:14:00Z'))) - 152.578_787_81)).toBeLessThan(1e-7);
  });

  it('agrees with satellite.js gstime to 5e-9 rad', () => {
    // gstime takes a float64 Julian date, which resolves about 40 microseconds near the
    // present, or 2.9e-9 rad of Earth rotation (2 cm in LEO). Our GMST works from
    // milliseconds and does not carry that rounding.
    fc.assert(
      fc.property(instant, (ms) => {
        const t = utcMs(ms);
        expect(Math.abs(angleDiff(gmstRad(t), gstime(julianDateFromUtcMs(t))))).toBeLessThan(5e-9);
      }),
    );
  });

  it('stays in [0, 2pi)', () => {
    fc.assert(
      fc.property(instant, (ms) => {
        const angle = gmstRad(utcMs(ms));
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThan(2 * Math.PI);
      }),
    );
  });
});

describe('temeToEcef', () => {
  it('rotates an SGP4 position as satellite.js eciToEcf does, given the same GMST (1e-9 km)', () => {
    // DELTA 1 DEB, from the SGP4 verification set. GMST itself is compared separately above.
    const sat = satelliteFromTle(
      '1 06251U 62025E   06176.82412014  .00008885  00000-0  12808-3 0  3985',
      '2 06251  58.0579  54.0425 0030035 139.1568 221.1854 15.56387291  6774',
    );
    const t = at('2006-06-26T12:00:00Z');
    const state = propagateTeme(sat, t);
    if (!state.ok) throw new Error(state.error);
    const { posTemeKm, velTemeKmS } = state.state;
    const { posEcefKm } = temeToEcef(posTemeKm, velTemeKmS, t);
    const reference = eciToEcf(posTemeKm, gmstRad(t));
    expect(magnitude(subtract(posEcefKm, vec3(reference.x, reference.y, reference.z)))).toBeLessThan(1e-9);
    expect(magnitude(posEcefKm)).toBeCloseTo(magnitude(posTemeKm), 9);
    expect(posEcefKm.z).toBe(posTemeKm.z);
  });

  it('gives an Earth-fixed velocity equal to the derivative of Earth-fixed position (1 mm/s)', () => {
    // An exact circular TEME trajectory, not SGP4: SGP4's own velocity differs from the
    // derivative of its position by about 2e-5 km/s, which would hide transform errors.
    // Central difference over +-0.1 s: truncation about 1e-7 km/s. A wrong sign on the
    // Earth-rotation term would be off by about 1 km/s.
    const radiusKm = 7000;
    const nRadS = 0.0011;
    const incRad = 0.9;
    const t0 = at('2026-11-11T00:00:00Z');
    const temeAt = (t: UtcMs) => {
      const u = (nRadS * (t - t0)) / 1000;
      return {
        pos: vec3<'teme', 'km'>(
          radiusKm * Math.cos(u),
          radiusKm * Math.sin(u) * Math.cos(incRad),
          radiusKm * Math.sin(u) * Math.sin(incRad),
        ),
        vel: vec3<'teme', 'km/s'>(
          -radiusKm * nRadS * Math.sin(u),
          radiusKm * nRadS * Math.cos(u) * Math.cos(incRad),
          radiusKm * nRadS * Math.cos(u) * Math.sin(incRad),
        ),
      };
    };
    const ecefAt = (t: UtcMs) => {
      const s = temeAt(t);
      return temeToEcef(s.pos, s.vel, t);
    };
    const hMs = 100;
    for (const offsetMs of [0, 1_234_567, 40_000_000]) {
      const t = utcMs(t0 + offsetMs);
      const before = ecefAt(utcMs(t - hMs)).posEcefKm;
      const after = ecefAt(utcMs(t + hMs)).posEcefKm;
      const spanS = (2 * hMs) / 1000;
      const numeric = vec3<'ecef', 'km/s'>(
        (after.x - before.x) / spanS,
        (after.y - before.y) / spanS,
        (after.z - before.z) / spanS,
      );
      expect(magnitude(subtract(ecefAt(t).velEcefKmS, numeric))).toBeLessThan(1e-6);
    }
  });
});

describe('ecefToGeodetic and geodeticToEcef (WGS-84)', () => {
  it('puts lat 0, lon 0, height 0 at (a, 0, 0)', () => {
    const p = geodeticToEcef({ latRad: rad(0), lonRad: rad(0), altKm: km(0) });
    expect(p.x).toBe(WGS84_A_KM);
    expect(p.y).toBe(0);
    expect(p.z).toBe(0);
  });

  it('puts the north pole at (0, 0, b) and back, b = 6356.7523142 km (NIMA TR8350.2)', () => {
    expect(WGS84_B_KM).toBeCloseTo(6356.752_314_2, 7);
    const g = ecefToGeodetic(vec3(0, 0, WGS84_B_KM));
    expect(radToDeg(g.latRad)).toBeCloseTo(90, 12);
    expect(g.altKm).toBeCloseTo(0, 9);
  });

  it('agrees with satellite.js eciToGeodetic (an independent iteration) to 1e-9 deg and 1 mm', () => {
    // Off the polar axis and above the surface only: on the axis satellite.js returns a wrong
    // height (6042 km off at (0, 0, -6000) km), while ours is covered by the pole test above.
    fc.assert(
      fc.property(
        fc.double({ min: -50_000, max: 50_000, noNaN: true }),
        fc.double({ min: -50_000, max: 50_000, noNaN: true }),
        fc.double({ min: -50_000, max: 50_000, noNaN: true }),
        (x, y, z) => {
          fc.pre(Math.hypot(x, y, z) > WGS84_A_KM && Math.hypot(x, y) > 1);
          const ours = ecefToGeodetic(vec3(x, y, z));
          // At GMST 0, satellite.js's ECI input is the Earth-fixed position.
          const ref = eciToGeodetic({ x, y, z }, 0);
          expect(Math.abs(radToDeg(rad(ours.latRad - ref.latitude)))).toBeLessThan(1e-9);
          expect(Math.abs(angleDiff(ours.lonRad, ref.longitude))).toBeLessThan(1e-12);
          expect(Math.abs(ours.altKm - ref.height)).toBeLessThan(1e-6);
        },
      ),
    );
  });

  it('matches Vallado example 3-3, r = (6524.834, 6862.875, 6448.296) km, to its printed precision', () => {
    // Printed: lat 34.352496 deg, lon 46.4464 deg, height 5085.22 km. Kaksha and satellite.js
    // both give lat 34.3524952 deg, which differs in the sixth decimal; we attribute that to the
    // book's iteration stopping tolerance (1.5e-8 rad, about 10 cm), so latitude is checked to 1e-5 deg.
    const g = ecefToGeodetic(vec3(6524.834, 6862.875, 6448.296));
    expect(Math.abs(radToDeg(g.latRad) - 34.352_496)).toBeLessThan(1e-5);
    expect(Math.abs(radToDeg(g.lonRad) - 46.4464)).toBeLessThan(5e-5);
    expect(Math.abs(g.altKm - 5085.22)).toBeLessThan(5e-3);
  });

  it('round-trips from the surface to beyond GEO to within 10 micrometres', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: -5, max: 400_000, noNaN: true }),
        (latDeg, lonDeg, altKm) => {
          const original = geodeticToEcef({
            latRad: degToRad(deg(latDeg)),
            lonRad: degToRad(deg(lonDeg)),
            altKm: km(altKm),
          });
          const back = geodeticToEcef(ecefToGeodetic(original));
          expect(magnitude(subtract(back, original))).toBeLessThan(1e-8);
          expect(ecefToGeodetic(original).altKm).toBeCloseTo(altKm, 8);
        },
      ),
    );
  });
});
