import { describe, expect, it } from 'vitest';
import {
  type Omm,
  propagateTeme,
  propagateTemeAtMinutes,
  satelliteFromOmm,
  satelliteFromTle,
} from './sgp4.ts';
import { type JulianDateUtc, utcMs, utcMsFromJulianDate, utcMsFromTleEpoch } from './time.ts';
import { minutes } from './units.ts';
import { magnitude, subtract } from './vectors.ts';

// Case 00005 from the SGP4 verification set (Vallado et al. 2006).
const LINE1 = '1 00005U 58002B   00179.78495062  .00000023  00000-0  28098-4 0  4753';
const LINE2 = '2 00005  34.2682 348.7242 1859667 331.7664  19.3264 10.82419157413667';

// The same element set as OMM. Epoch 00179.78495062 is 2000-06-27T18:50:19.733568Z.
const OMM: Omm = {
  OBJECT_NAME: 'TEST 5',
  OBJECT_ID: '1958-002B',
  EPOCH: '2000-06-27T18:50:19.733568',
  MEAN_MOTION: 10.824_191_57,
  ECCENTRICITY: 0.185_966_7,
  INCLINATION: 34.2682,
  RA_OF_ASC_NODE: 348.7242,
  ARG_OF_PERICENTER: 331.7664,
  MEAN_ANOMALY: 19.3264,
  NORAD_CAT_ID: 5,
  ELEMENT_SET_NO: 475,
  REV_AT_EPOCH: 41_366,
  BSTAR: 0.280_98e-4,
  MEAN_MOTION_DOT: 0.000_000_23,
  MEAN_MOTION_DDOT: 0,
};

describe('epochUtcMs', () => {
  it('reads the TLE epoch as a UTC instant in 2000, not 1900', () => {
    expect(satelliteFromTle(LINE1, LINE2).epochUtcMs).toBe(utcMsFromTleEpoch(0, 179.784_950_62));
  });

  it("agrees with satellite.js's own epoch (jdsatepoch) to 0.1 ms for TLE and OMM", () => {
    for (const sat of [satelliteFromTle(LINE1, LINE2), satelliteFromOmm(OMM)]) {
      const fromJd = utcMsFromJulianDate(sat.satrec.jdsatepoch as JulianDateUtc);
      expect(Math.abs(sat.epochUtcMs - fromJd)).toBeLessThan(0.1);
    }
  });
});

describe('satelliteFromTle', () => {
  it('normalises the catalogue number the same way for TLE and OMM', () => {
    expect(satelliteFromTle(LINE1, LINE2).noradId).toBe('5');
    expect(satelliteFromOmm(OMM).noradId).toBe('5');
  });

  it('gives a period within 0.5% of 1440 / revs per day (Kozai vs Brouwer mean motion)', () => {
    // 10.82419157 rev/day is 133.0352 min; SGP4's Brouwer mean motion differs slightly.
    const period = satelliteFromTle(LINE1, LINE2).periodMin;
    expect(Math.abs(period / (1440 / 10.824_191_57) - 1)).toBeLessThan(0.005);
  });

  it('throws on lines that do not parse', () => {
    expect(() => satelliteFromTle('1 garbage', '2 garbage')).toThrow(RangeError);
  });
});

describe('propagateTeme', () => {
  const sat = satelliteFromTle(LINE1, LINE2);

  it('at a UTC instant matches propagation by minutes since epoch (1e-9 km)', () => {
    const byTime = propagateTeme(sat, utcMs(sat.epochUtcMs + 360 * 60_000));
    const byMinutes = propagateTemeAtMinutes(sat, minutes(360));
    if (!byTime.ok || !byMinutes.ok) throw new Error('propagation failed');
    expect(magnitude(subtract(byTime.state.posTemeKm, byMinutes.state.posTemeKm))).toBeLessThan(1e-9);
  });

  it('returns a typed error instead of null when SGP4 fails', () => {
    // MINOTAUR R/B from the verification set decays 55 minutes after epoch.
    const decaying = satelliteFromTle(
      '1 28872U 05037B   05333.02012661  .25992681  00000-0  24476-3 0  1534',
      '2 28872  96.4736 157.9986 0303955 244.0492 110.6523 16.46015938 10708',
    );
    expect(propagateTemeAtMinutes(decaying, minutes(55))).toEqual({ ok: false, error: 'decayed' });
  });
});

describe('satelliteFromOmm', () => {
  it('matches the TLE of the same element set to within 10 m over 3 days', () => {
    // satellite.js truncates the OMM epoch to whole milliseconds (here 0.568 ms early),
    // so the two differ by under 1 ms of motion: under 10 m at this orbit's speeds.
    const fromOmm = satelliteFromOmm(OMM);
    const fromTle = satelliteFromTle(LINE1, LINE2);
    for (let m = 0; m <= 4320; m += 360) {
      const t = utcMs(fromTle.epochUtcMs + m * 60_000);
      const a = propagateTeme(fromOmm, t);
      const b = propagateTeme(fromTle, t);
      if (!a.ok || !b.ok) throw new Error('propagation failed');
      expect(magnitude(subtract(a.state.posTemeKm, b.state.posTemeKm))).toBeLessThan(0.01);
    }
  });
});
