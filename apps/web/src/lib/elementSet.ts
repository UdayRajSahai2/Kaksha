/**
 * Turns pasted text into a loaded element set: two-line elements (with an optional
 * name line) or one OMM record in JSON as CelesTrak or Space-Track publish it.
 * Every failure becomes a message that says what is wrong and what to do.
 */
import {
  type Omm,
  type Sgp4Satellite,
  satelliteFromOmm,
  satelliteFromTle,
  tleChecksumValid,
} from '@kaksha/astro';

export type LoadedElementSet = {
  readonly satellite: Sgp4Satellite;
  readonly name: string | null;
  readonly format: 'TLE' | 'OMM';
  /** TLE only: false when a line's checksum does not match (the elements still load). */
  readonly checksumsValid: boolean | null;
  /** OMM only: how many records the JSON held; the first is used. */
  readonly recordCount: number;
};

export type ParseResult =
  | { readonly ok: true; readonly value: LoadedElementSet }
  | { readonly ok: false; readonly message: string };

const TLE_LINE_LENGTH = 69;
const OMM_NUMBERS = [
  'MEAN_MOTION',
  'ECCENTRICITY',
  'INCLINATION',
  'RA_OF_ASC_NODE',
  'ARG_OF_PERICENTER',
  'MEAN_ANOMALY',
  'NORAD_CAT_ID',
  'BSTAR',
  'MEAN_MOTION_DOT',
  'MEAN_MOTION_DDOT',
] as const;
const OMM_EPOCH = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;

export function parseElementSet(text: string): ParseResult {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, message: 'Paste an element set to begin.' };
  return trimmed.startsWith('{') || trimmed.startsWith('[') ? parseOmm(trimmed) : parseTle(trimmed);
}

function parseTle(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '');
  const i = lines.findIndex((line, n) => line.startsWith('1 ') && lines[n + 1]?.startsWith('2 '));
  const line1 = lines[i];
  const line2 = lines[i + 1];
  if (i < 0 || line1 === undefined || line2 === undefined) {
    return {
      ok: false,
      message:
        'No two-line element set found. Line 1 must start with “1 ” and be followed by line 2 starting with “2 ”.',
    };
  }
  for (const [n, line] of [line1, line2].entries()) {
    if (line.length !== TLE_LINE_LENGTH) {
      return {
        ok: false,
        message: `Line ${n + 1} is ${line.length} characters; a TLE line is ${TLE_LINE_LENGTH}. Check it was copied whole.`,
      };
    }
  }
  const nameLine = i > 0 ? lines[i - 1] : undefined;
  return load(() => satelliteFromTle(line1, line2), {
    name: nameLine === undefined ? null : nameLine.replace(/^0 /, '').trim(),
    format: 'TLE',
    checksumsValid: tleChecksumValid(line1) && tleChecksumValid(line2),
    recordCount: 1,
  });
}

function parseOmm(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message: 'This looks like JSON but does not parse. Paste one OMM record or a list of them.',
    };
  }
  const records = Array.isArray(json) ? json : [json];
  const record: unknown = records[0];
  if (typeof record !== 'object' || record === null) {
    return { ok: false, message: 'The JSON holds no OMM record.' };
  }
  const r = record as Record<string, unknown>;
  const numbers: Partial<Record<(typeof OMM_NUMBERS)[number], number>> = {};
  for (const key of OMM_NUMBERS) {
    const value = Number(r[key]);
    if (r[key] === undefined || r[key] === '' || !Number.isFinite(value)) {
      return { ok: false, message: `The OMM record has no numeric ${key}.` };
    }
    numbers[key] = value;
  }
  const epoch = r.EPOCH;
  if (typeof epoch !== 'string' || !OMM_EPOCH.test(epoch)) {
    return { ok: false, message: 'The OMM EPOCH must be a UTC time such as 2026-11-11T06:12:34.567890.' };
  }
  const omm = {
    ...(numbers as Record<(typeof OMM_NUMBERS)[number], number>),
    OBJECT_NAME: typeof r.OBJECT_NAME === 'string' ? r.OBJECT_NAME : '',
    OBJECT_ID: typeof r.OBJECT_ID === 'string' ? r.OBJECT_ID : '',
    EPOCH: epoch,
    ELEMENT_SET_NO: Number(r.ELEMENT_SET_NO) || 0,
    REV_AT_EPOCH: Number(r.REV_AT_EPOCH) || 0,
  } satisfies Omm;
  return load(() => satelliteFromOmm(omm), {
    name: omm.OBJECT_NAME || null,
    format: 'OMM',
    checksumsValid: null,
    recordCount: records.length,
  });
}

function load(make: () => Sgp4Satellite, rest: Omit<LoadedElementSet, 'satellite'>): ParseResult {
  try {
    return { ok: true, value: { satellite: make(), ...rest } };
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { ok: false, message: `SGP4 cannot use these elements: ${error.message.replace(/^.*: /, '')}.` };
  }
}
