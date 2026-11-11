import { describe, expect, it } from 'vitest';
import { tleChecksumValid } from './tle.ts';

// ISS, 2008, the worked example in CelesTrak's and Wikipedia's TLE format descriptions.
const ISS_1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const ISS_2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';

describe('tleChecksumValid', () => {
  it('accepts the published ISS example (minus signs count as 1)', () => {
    expect(tleChecksumValid(ISS_1)).toBe(true);
    expect(tleChecksumValid(ISS_2)).toBe(true);
  });

  it('rejects a line with one digit changed', () => {
    expect(tleChecksumValid(ISS_2.replace('51.6416', '51.6417'))).toBe(false);
  });

  it('rejects short lines and a non-digit checksum column', () => {
    expect(tleChecksumValid(ISS_1.slice(0, 68))).toBe(false);
    expect(tleChecksumValid(`${ISS_1.slice(0, 68)}X`)).toBe(false);
  });
});
