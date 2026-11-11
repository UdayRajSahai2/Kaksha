/**
 * Runs SGP4 against the published verification vectors (spec CORE-06).
 * Reference: Vallado et al., "Revisiting Spacetrack Report #3", AIAA 2006-6753.
 * Pure: takes the two reference files as text, so the test suite and the web
 * workbench run the same comparison.
 *
 * Tolerances: the reference prints positions to 1e-8 km and velocities to 1e-9 km/s.
 * satellite.js runs the same algorithm with the same WGS-72 constants, so differences
 * come only from float64 operation order, which grows over long spans. Allowed: 100
 * times the printed precision.
 */
import { propagateTemeAtMinutes, satelliteFromTle } from './sgp4.ts';
import { type Km, type KmPerS, km, kmPerS, minutes } from './units.ts';
import { magnitude, subtract, vec3 } from './vectors.ts';

export const VERIFICATION_POSITION_TOLERANCE_KM = km(1e-6);
export const VERIFICATION_VELOCITY_TOLERANCE_KM_S = kmPerS(1e-7);

export type VerificationCase = {
  readonly satnum: number;
  readonly line1: string;
  readonly line2: string;
  readonly startMin: number;
  readonly stopMin: number;
  readonly stepMin: number;
};

export type ReferenceRow = {
  readonly minutes: number;
  readonly posKm: readonly [number, number, number];
  readonly velKmS: readonly [number, number, number];
};

export type ReferenceBlock = { readonly satnum: number; readonly rows: readonly ReferenceRow[] };

export type CaseResult = {
  readonly satnum: number;
  readonly startMin: number;
  readonly stopMin: number;
  readonly points: number;
  readonly maxPosErrKm: Km;
  readonly maxVelErrKmS: KmPerS;
  /** What happened after the last reference row: ran to the stop time, an SGP4 error, or rejected at load. */
  readonly ending: string;
  readonly withinTolerance: boolean;
};

export type VerificationSummary = {
  readonly cases: readonly CaseResult[];
  readonly points: number;
  readonly maxPosErrKm: Km;
  readonly rmsPosErrKm: Km;
  readonly maxVelErrKmS: KmPerS;
  readonly allWithinTolerance: boolean;
};

export function parseVerificationCases(text: string): VerificationCase[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '' && !line.startsWith('#'));
  const cases: VerificationCase[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const line1 = lines[i] ?? '';
    const line2 = lines[i + 1] ?? '';
    const [startMin, stopMin, stepMin] = line2.slice(69).trim().split(/\s+/).map(Number);
    if (startMin === undefined || stopMin === undefined || stepMin === undefined) {
      throw new Error(`Missing start, stop and step on: ${line2}`);
    }
    cases.push({
      satnum: Number(line1.slice(2, 7)),
      line1,
      line2: line2.slice(0, 69),
      startMin,
      stopMin,
      stepMin,
    });
  }
  return cases;
}

export function parseVerificationReference(text: string): ReferenceBlock[] {
  const blocks: { satnum: number; rows: ReferenceRow[] }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const header = /^\s*(\d+) xx/.exec(line);
    if (header) {
      blocks.push({ satnum: Number(header[1]), rows: [] });
      continue;
    }
    const f = line.trim().split(/\s+/).map(Number);
    if (f.length < 7) continue;
    const [t = Number.NaN, x = 0, y = 0, z = 0, vx = 0, vy = 0, vz = 0] = f;
    blocks.at(-1)?.rows.push({ minutes: t, posKm: [x, y, z], velKmS: [vx, vy, vz] });
  }
  return blocks;
}

export function runSgp4Verification(casesText: string, referenceText: string): VerificationSummary {
  const cases = parseVerificationCases(casesText);
  const blocks = parseVerificationReference(referenceText);
  if (blocks.length !== cases.length) {
    throw new Error(`${cases.length} cases but ${blocks.length} reference blocks`);
  }
  const squared: number[] = [];
  const results = cases.map((c, i) => runCase(c, blocks[i] as ReferenceBlock, squared));
  return {
    cases: results,
    points: squared.length,
    maxPosErrKm: km(Math.max(...results.map((r) => r.maxPosErrKm))),
    rmsPosErrKm: km(Math.sqrt(squared.reduce((sum, v) => sum + v, 0) / squared.length)),
    maxVelErrKmS: kmPerS(Math.max(...results.map((r) => r.maxVelErrKmS))),
    allWithinTolerance: results.every((r) => r.withinTolerance),
  };
}

function runCase(c: VerificationCase, block: ReferenceBlock, squared: number[]): CaseResult {
  if (block.satnum !== c.satnum) {
    throw new Error(`Case ${c.satnum} paired with reference block ${block.satnum}`);
  }
  const base = { satnum: c.satnum, startMin: c.startMin, stopMin: c.stopMin };
  let sat: ReturnType<typeof satelliteFromTle>;
  try {
    sat = satelliteFromTle(c.line1, c.line2);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    const reason = error.message.replace(/^.*: /, '');
    return {
      ...base,
      points: 0,
      maxPosErrKm: km(0),
      maxVelErrKmS: kmPerS(0),
      ending: `rejected when loaded: ${reason}`,
      withinTolerance: true,
    };
  }
  let maxPos = 0;
  let maxVel = 0;
  for (const row of block.rows) {
    const result = propagateTemeAtMinutes(sat, minutes(row.minutes));
    if (!result.ok) {
      throw new Error(`${c.satnum} at ${row.minutes} min: ${result.error}`);
    }
    const dPos = magnitude(subtract(result.state.posTemeKm, vec3<'teme', 'km'>(...row.posKm)));
    const dVel = magnitude(subtract(result.state.velTemeKmS, vec3<'teme', 'km/s'>(...row.velKmS)));
    maxPos = Math.max(maxPos, dPos);
    maxVel = Math.max(maxVel, dVel);
    squared.push(dPos * dPos);
  }
  const last = block.rows.at(-1)?.minutes ?? c.startMin;
  let ending = 'ran to stop time';
  let endedAsExpected = true;
  if (last < c.stopMin) {
    // The reference lists only steps that propagated, so the next step must fail.
    const next = Math.min(last + c.stepMin, c.stopMin);
    const result = propagateTemeAtMinutes(sat, minutes(next));
    endedAsExpected = !result.ok;
    ending = result.ok ? `propagated at ${next} min, expected an error` : `${result.error} at ${next} min`;
  }
  return {
    ...base,
    points: block.rows.length,
    maxPosErrKm: km(maxPos),
    maxVelErrKmS: kmPerS(maxVel),
    ending,
    withinTolerance:
      endedAsExpected &&
      maxPos <= VERIFICATION_POSITION_TOLERANCE_KM &&
      maxVel <= VERIFICATION_VELOCITY_TOLERANCE_KM_S,
  };
}
