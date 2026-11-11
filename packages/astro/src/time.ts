/**
 * Time utilities (spec CORE-02).
 *
 * Conventions, also listed in docs/known-limits.md:
 * - A UTC instant is `UtcMs`: milliseconds since 1970-01-01T00:00:00Z, the value
 *   `Date.prototype.getTime()` returns. Like Unix time it does not count leap
 *   seconds: every UTC day is treated as 86 400 s long.
 * - Julian dates carry their time scale in their type. Only UTC Julian dates are
 *   produced here. Where Earth rotation needs UT1, UTC stands in for it; the IERS
 *   keeps |UT1 - UTC| below 0.9 s.
 * - A float64 Julian date near 2.46e6 resolves 2^-31 day, about 40 microseconds.
 */
import type { Brand } from './units.ts';

export type UtcMs = Brand<'utc-ms'>;
export type JulianDateUtc = Brand<'jd-utc'>;

const MS_PER_DAY = 86_400_000;

/** JD of the Unix epoch, 1970-01-01T00:00:00Z. Meeus, Astronomical Algorithms, 2nd ed., ch. 7. */
const JD_UNIX_EPOCH = 2_440_587.5;

/**
 * Two-digit TLE years below this are 20xx, the rest 19xx.
 * Vallado et al., "Revisiting Spacetrack Report #3", AIAA 2006-6753.
 */
const TLE_PIVOT_YEAR = 57;

export function utcMs(value: number): UtcMs {
  if (!Number.isFinite(value)) {
    throw new RangeError(`UTC milliseconds must be finite, got ${value}`);
  }
  return value as UtcMs;
}

export function utcMsFromDate(date: Date): UtcMs {
  return utcMs(date.getTime());
}

export function julianDateFromUtcMs(t: UtcMs): JulianDateUtc {
  return (t / MS_PER_DAY + JD_UNIX_EPOCH) as JulianDateUtc;
}

export function utcMsFromJulianDate(jd: JulianDateUtc): UtcMs {
  return utcMs((jd - JD_UNIX_EPOCH) * MS_PER_DAY);
}

/**
 * UTC instant of a TLE epoch: a two-digit year and a fractional day of year,
 * where day 1.0 is 1 January 00:00:00 UTC.
 */
export function utcMsFromTleEpoch(twoDigitYear: number, dayOfYear: number): UtcMs {
  if (!Number.isInteger(twoDigitYear) || twoDigitYear < 0 || twoDigitYear > 99) {
    throw new RangeError(`TLE year must be an integer from 0 to 99, got ${twoDigitYear}`);
  }
  const year = twoDigitYear < TLE_PIVOT_YEAR ? 2000 + twoDigitYear : 1900 + twoDigitYear;
  return utcMsFromYearAndDayOfYear(year, dayOfYear);
}

function utcMsFromYearAndDayOfYear(year: number, dayOfYear: number): UtcMs {
  if (!Number.isInteger(year)) {
    throw new RangeError(`Year must be an integer, got ${year}`);
  }
  const daysInYear = isLeapYear(year) ? 366 : 365;
  if (!(dayOfYear >= 1 && dayOfYear < daysInYear + 1)) {
    throw new RangeError(`Day of year must be in [1, ${daysInYear + 1}) for ${year}, got ${dayOfYear}`);
  }
  return utcMs(Date.UTC(year, 0, 1) + (dayOfYear - 1) * MS_PER_DAY);
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
