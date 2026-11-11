import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { julianDateFromUtcMs, utcMs, utcMsFromDate, utcMsFromJulianDate, utcMsFromTleEpoch } from './time.ts';

const at = (iso: string) => utcMsFromDate(new Date(iso));

// Inputs span the space age to 2100, as integer milliseconds.
const MIN_MS = Date.UTC(1957, 0, 1);
const MAX_MS = Date.UTC(2100, 0, 1);
const instant = fc.integer({ min: MIN_MS, max: MAX_MS });

describe('utcMs', () => {
  it('rejects non-finite values and invalid dates', () => {
    expect(() => utcMs(Number.NaN)).toThrow(RangeError);
    expect(() => utcMs(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => utcMsFromDate(new Date('not a date'))).toThrow(RangeError);
  });
});

describe('julianDateFromUtcMs', () => {
  it('gives JD 2440587.5 at the Unix epoch (Meeus ch. 7)', () => {
    expect(julianDateFromUtcMs(at('1970-01-01T00:00:00Z'))).toBe(2_440_587.5);
  });

  it('gives JD 2451545.0 at 2000-01-01T12:00 (J2000 epoch, Vallado sec. 3.5)', () => {
    expect(julianDateFromUtcMs(at('2000-01-01T12:00:00Z'))).toBe(2_451_545.0);
  });

  it('matches Vallado example 3-4: 1996-10-26 14:20 UT is JD 2450383.09722222', () => {
    // Vallado prints 8 decimals; tolerance 1e-8 day is under 1 ms.
    const jd = julianDateFromUtcMs(at('1996-10-26T14:20:00Z'));
    expect(Math.abs(jd - 2_450_383.097_222_22)).toBeLessThan(1e-8);
  });

  it('round-trips to within 0.1 ms (float64 JD resolves about 40 microseconds)', () => {
    fc.assert(
      fc.property(instant, (ms) => {
        const back = utcMsFromJulianDate(julianDateFromUtcMs(utcMs(ms)));
        expect(Math.abs(back - ms)).toBeLessThanOrEqual(0.1);
      }),
    );
  });

  it('is strictly increasing for instants 1 ms or more apart', () => {
    fc.assert(
      fc.property(instant, instant, (a, b) => {
        fc.pre(a !== b);
        const [early, late] = a < b ? [a, b] : [b, a];
        expect(julianDateFromUtcMs(utcMs(early))).toBeLessThan(julianDateFromUtcMs(utcMs(late)));
      }),
    );
  });
});

describe('utcMsFromTleEpoch', () => {
  it('reads day 1.0 as 1 January 00:00 UTC', () => {
    expect(utcMsFromTleEpoch(98, 1.0)).toBe(Date.UTC(1998, 0, 1));
    expect(utcMsFromTleEpoch(0, 1.5)).toBe(Date.UTC(2000, 0, 1, 12));
  });

  it('pivots two-digit years at 57 (Vallado et al. 2006)', () => {
    expect(utcMsFromTleEpoch(56, 1)).toBe(Date.UTC(2056, 0, 1));
    expect(utcMsFromTleEpoch(57, 1)).toBe(Date.UTC(1957, 0, 1));
    expect(utcMsFromTleEpoch(99, 1)).toBe(Date.UTC(1999, 0, 1));
  });

  it('decodes ISS epoch 08264.51782528 as 2008-09-20T12:25:40.104Z to within 1 ms', () => {
    // 2008 is a leap year: day 264 is 20 September; 0.51782528 day is 44 740.104 s.
    const expected = Date.UTC(2008, 8, 20, 12, 25, 40, 104);
    expect(Math.abs(utcMsFromTleEpoch(8, 264.517_825_28) - expected)).toBeLessThan(1);
  });

  it('accepts day 366 only in leap years', () => {
    expect(utcMsFromTleEpoch(24, 366)).toBe(Date.UTC(2024, 11, 31));
    expect(() => utcMsFromTleEpoch(23, 366)).toThrow(RangeError);
  });

  it('rejects out-of-range input', () => {
    expect(() => utcMsFromTleEpoch(24, 0.5)).toThrow(RangeError);
    expect(() => utcMsFromTleEpoch(100, 1)).toThrow(RangeError);
    expect(() => utcMsFromTleEpoch(1.5, 1)).toThrow(RangeError);
    expect(() => utcMsFromTleEpoch(2000, 1)).toThrow(RangeError);
    expect(() => utcMsFromTleEpoch(24, Number.NaN)).toThrow(RangeError);
  });
});
