import { utcMsFromTleEpoch } from '@kaksha/astro';
import { describe, expect, it } from 'vitest';
import { parseElementSet } from './elementSet.ts';
import { age, fixed, latitude, longitude } from './format.ts';
import { parseUtc } from './parseUtc.ts';

// ISS, 2008: the worked example in CelesTrak's TLE format description.
const NAME = 'ISS (ZARYA)';
const L1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const L2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

describe('parseElementSet', () => {
  it('reads a three-line TLE with its name and valid checksums', () => {
    const r = parseElementSet(`${NAME}\n${L1}\n${L2}\n`);
    if (!r.ok) throw new Error(r.message);
    expect(r.value.name).toBe(NAME);
    expect(r.value.format).toBe('TLE');
    expect(r.value.checksumsValid).toBe(true);
    expect(r.value.satellite.noradId).toBe('25544');
  });

  it('loads but flags a TLE whose checksum does not match', () => {
    const r = parseElementSet(`${L1}\n${L2.replace('51.6416', '51.6417')}`);
    expect(r.ok && r.value.checksumsValid).toBe(false);
  });

  it('says why a truncated line is refused', () => {
    const r = parseElementSet(`${L1}\n${L2.slice(0, 60)}`);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.message).toMatch(/Line 2 is 60 characters/);
  });

  it('reads an OMM record with string numbers (Space-Track style) to the same epoch as the TLE', () => {
    const omm = {
      OBJECT_NAME: NAME,
      OBJECT_ID: '1998-067A',
      EPOCH: '2008-09-20T12:25:40.104192',
      MEAN_MOTION: '15.72125391',
      ECCENTRICITY: '0.0006703',
      INCLINATION: '51.6416',
      RA_OF_ASC_NODE: '247.4627',
      ARG_OF_PERICENTER: '130.5360',
      MEAN_ANOMALY: '325.0288',
      NORAD_CAT_ID: '25544',
      ELEMENT_SET_NO: '292',
      REV_AT_EPOCH: '56353',
      BSTAR: '-0.11606E-4',
      MEAN_MOTION_DOT: '-0.00002182',
      MEAN_MOTION_DDOT: '0',
    };
    const r = parseElementSet(JSON.stringify([omm]));
    if (!r.ok) throw new Error(r.message);
    expect(r.value.format).toBe('OMM');
    // OMM epochs are truncated to whole milliseconds when loaded (docs/known-limits.md).
    expect(Math.abs(r.value.satellite.epochUtcMs - utcMsFromTleEpoch(8, 264.517_825_28))).toBeLessThan(1);
  });

  it('refuses an OMM epoch with a time-zone offset rather than misreading it', () => {
    const r = parseElementSet(
      '{"EPOCH":"2008-09-20T12:25:40+05:30","MEAN_MOTION":15,"ECCENTRICITY":0,"INCLINATION":0,"RA_OF_ASC_NODE":0,"ARG_OF_PERICENTER":0,"MEAN_ANOMALY":0,"NORAD_CAT_ID":1,"BSTAR":0,"MEAN_MOTION_DOT":0,"MEAN_MOTION_DDOT":0}',
    );
    expect(r.ok).toBe(false);
  });

  it('treats empty input as empty, not as an error to fix', () => {
    expect(parseElementSet('  \n ')).toEqual({ ok: false, message: 'Paste an element set to begin.' });
  });
});

describe('parseUtc', () => {
  it('accepts UTC with a Z, to the millisecond', () => {
    expect(parseUtc('2026-11-11T06:00:00Z')).toBe(Date.UTC(2026, 10, 11, 6));
    expect(parseUtc('2026-11-11T06:00:00.250Z')).toBe(Date.UTC(2026, 10, 11, 6, 0, 0, 250));
  });

  it('refuses local times, offsets and impossible dates', () => {
    expect(parseUtc('2026-11-11T06:00:00')).toBeNull();
    expect(parseUtc('2026-11-11T06:00:00+05:30')).toBeNull();
    expect(parseUtc('2026-04-31T00:00:00Z')).toBeNull();
  });
});

describe('format', () => {
  it('uses a true minus sign and hemisphere letters', () => {
    expect(fixed(-1.5, 2)).toBe('−1.50');
    expect(fixed(-0.0001, 2)).toBe('0.00');
    expect(latitude(-33.8)).toBe('33.800° S');
    expect(longitude(151.2)).toBe('151.200° E');
  });

  it('describes element age relative to the epoch', () => {
    expect(age(0)).toBe('at epoch');
    expect(age((2 * 1440 + 3 * 60) * 60_000)).toBe('2 d 03 h after epoch');
    expect(age(-(5 * 60 + 2) * 60_000)).toBe('5 h 02 min before epoch');
  });
});
