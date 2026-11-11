import { describe, expect, it } from 'vitest';
import { WGS84_A_KM } from './earth.ts';
import { eclipseIntervals, shadowMarginKm } from './eclipse.ts';
import { propagateTeme, satelliteFromTle } from './sgp4.ts';
import { sunPositionTemeKm } from './sun.ts';
import { utcMs } from './time.ts';
import { magnitude, vec3 } from './vectors.ts';

const sun = vec3<'teme', 'km'>(1.5e8, 0, 0);

describe('shadowMarginKm (cylindrical shadow)', () => {
  it('is negative directly behind the Earth and positive on the day side', () => {
    expect(shadowMarginKm(vec3(-7000, 0, 0), sun)).toBeCloseTo(-WGS84_A_KM, 6);
    expect(shadowMarginKm(vec3(7000, 0, 0), sun)).toBeGreaterThan(0);
  });

  it('crosses zero at the shadow cylinder and is continuous across the terminator plane', () => {
    expect(shadowMarginKm(vec3(-7000, WGS84_A_KM, 0), sun)).toBeCloseTo(0, 9);
    const justBehind = shadowMarginKm(vec3(-1e-9, 7000, 0), sun);
    const justAhead = shadowMarginKm(vec3(1e-9, 7000, 0), sun);
    expect(Math.abs(justBehind - justAhead)).toBeLessThan(1e-9);
  });
});

describe('eclipseIntervals', () => {
  // DELTA 1 DEB, from the SGP4 verification set: a near-circular LEO orbit (e = 0.003).
  const sat = satelliteFromTle(
    '1 06251U 62025E   06176.82412014  .00008885  00000-0  12808-3 0  3985',
    '2 06251  58.0579  54.0425 0030035 139.1568 221.1854 15.56387291  6774',
  );

  it('matches the closed-form cylindrical-shadow duration for the orbit and beta angle (to 30 s)', () => {
    const from = sat.epochUtcMs;
    const to = utcMs(from + 4 * 3600_000);
    const full = eclipseIntervals(sat, from, to).filter((e) => e.entry !== null && e.exit !== null);
    expect(full.length).toBeGreaterThanOrEqual(2);
    for (const e of full) {
      const mid = utcMs(((e.entry as number) + (e.exit as number)) / 2);
      const s = propagateTeme(sat, mid);
      if (!s.ok) throw new Error(s.error);
      const r = s.state.posTemeKm;
      const v = s.state.velTemeKmS;
      // Orbit normal h = r x v; beta is the Sun's elevation above the orbit plane.
      const h = vec3<'teme', 'km'>(r.y * v.z - r.z * v.y, r.z * v.x - r.x * v.z, r.x * v.y - r.y * v.x);
      const sunDir = sunPositionTemeKm(mid);
      const sinBeta = (h.x * sunDir.x + h.y * sunDir.y + h.z * sunDir.z) / (magnitude(h) * magnitude(sunDir));
      const radius = magnitude(r);
      // Circular orbit, cylindrical shadow: in shadow while the angle u from the anti-Sun point
      // satisfies cos(u) > sqrt(r^2 - R^2) / (r cos(beta)), so the time in shadow is (u0 / pi) * period.
      // Vallado, Fundamentals of Astrodynamics, 4th ed., sec. 5.3.
      const cosBeta = Math.sqrt(1 - sinBeta * sinBeta);
      const u0 = Math.acos(Math.sqrt(radius ** 2 - WGS84_A_KM ** 2) / (radius * cosBeta));
      const expectedS = (u0 / Math.PI) * sat.periodMin * 60;
      const durationS = ((e.exit as number) - (e.entry as number)) / 1000;
      expect(Math.abs(durationS - expectedS)).toBeLessThan(30);
    }
  });
});
