/**
 * SGP4/SDP4 propagation (spec CORE-03), wrapping satellite.js 7.
 *
 * satellite.js implements Vallado's SGP4 in 'i' (improved) mode with WGS-72
 * gravity constants, the configuration the published verification vectors use.
 * Output is in the TEME frame. satellite.js types do not leave this module (ADR-0006).
 *
 * Limits, also in docs/known-limits.md:
 * - satellite.js reads OMM epochs through JavaScript Date, which truncates them to
 *   whole milliseconds: under 1 ms of epoch error, under 8 m along-track in LEO.
 * - Official SGP4 behaviour is kept: satellite.js's opt-in "community decay check"
 *   is not enabled, so long-decayed objects can return positions until SGP4 itself
 *   reports an error.
 */
import {
  json2satrec,
  type OMMJsonObject,
  type SatRec,
  SatRecError,
  sgp4,
  twoline2satrec,
} from 'satellite.js';
import { type UtcMs, utcMsFromTleEpoch } from './time.ts';
import { type Minutes, minutes } from './units.ts';
import { type Vec3, vec3 } from './vectors.ts';

const MS_PER_MINUTE = 60_000;

/** A loaded element set. Opaque: pass it to the propagate functions. */
export type Sgp4Satellite = {
  readonly noradId: string;
  readonly epochUtcMs: UtcMs;
  /**
   * 2 pi over SGP4's mean motion at epoch (the Brouwer value SGP4 derives from the
   * element set's Kozai mean motion). For sizing displays such as one orbit of ground
   * track; orbit analysis derives its own elements (spec HIST-01).
   */
  readonly periodMin: Minutes;
  readonly satrec: SatRec;
};

/** An OMM element set with numeric fields, as CelesTrak publishes it (ING-01). */
export type Omm = {
  readonly OBJECT_NAME: string;
  readonly OBJECT_ID: string;
  /** ISO 8601 UTC, with or without a trailing Z. */
  readonly EPOCH: string;
  readonly MEAN_MOTION: number;
  readonly ECCENTRICITY: number;
  readonly INCLINATION: number;
  readonly RA_OF_ASC_NODE: number;
  readonly ARG_OF_PERICENTER: number;
  readonly MEAN_ANOMALY: number;
  readonly NORAD_CAT_ID: number;
  readonly ELEMENT_SET_NO: number;
  readonly REV_AT_EPOCH: number;
  readonly BSTAR: number;
  readonly MEAN_MOTION_DOT: number;
  readonly MEAN_MOTION_DDOT: number;
};

export type Sgp4Error =
  | 'mean-eccentricity-out-of-range'
  | 'mean-motion-below-zero'
  | 'perturbed-eccentricity-out-of-range'
  | 'semi-latus-rectum-below-zero'
  | 'decayed';

export type TemeState = {
  readonly posTemeKm: Vec3<'teme', 'km'>;
  readonly velTemeKmS: Vec3<'teme', 'km/s'>;
};

export type PropagationResult =
  | { readonly ok: true; readonly state: TemeState }
  | { readonly ok: false; readonly error: Sgp4Error };

/**
 * Loads a TLE. Columns are parsed by satellite.js; checksums are not verified here
 * (ingestion validates them, spec ING-03). Throws if the lines do not parse or
 * SGP4 initialisation rejects the elements.
 */
export function satelliteFromTle(line1: string, line2: string): Sgp4Satellite {
  return fromSatrec(twoline2satrec(line1, line2));
}

export function satelliteFromOmm(omm: Omm): Sgp4Satellite {
  return fromSatrec(json2satrec(omm satisfies OMMJsonObject));
}

/** Propagates to a UTC instant. */
export function propagateTeme(satellite: Sgp4Satellite, t: UtcMs): PropagationResult {
  return propagateTemeAtMinutes(satellite, minutes((t - satellite.epochUtcMs) / MS_PER_MINUTE));
}

/** Propagates to a time measured from the element set's epoch, as SGP4 itself does. */
export function propagateTemeAtMinutes(satellite: Sgp4Satellite, sinceEpoch: Minutes): PropagationResult {
  const result = sgp4(satellite.satrec, sinceEpoch);
  if (result === null) {
    return { ok: false, error: describeError(satellite.satrec.error) };
  }
  const { position: p, velocity: v } = result;
  return {
    ok: true,
    state: { posTemeKm: vec3(p.x, p.y, p.z), velTemeKmS: vec3(v.x, v.y, v.z) },
  };
}

function fromSatrec(satrec: SatRec): Sgp4Satellite {
  const elements = [
    satrec.no,
    satrec.ecco,
    satrec.inclo,
    satrec.nodeo,
    satrec.argpo,
    satrec.mo,
    satrec.bstar,
  ];
  if (!elements.every(Number.isFinite) || !Number.isFinite(satrec.epochdays)) {
    throw new RangeError(`Element set ${satrec.satnum} did not parse to finite elements`);
  }
  if (satrec.error !== SatRecError.None) {
    throw new RangeError(`SGP4 rejected element set ${satrec.satnum}: ${describeError(satrec.error)}`);
  }
  return {
    // TLE catalogue numbers are zero-padded ("00005"); OMM gives a number. Alpha-5 ids stay as written.
    noradId: /^\d+$/.test(satrec.satnum.trim()) ? String(Number(satrec.satnum)) : satrec.satnum.trim(),
    periodMin: minutes((2 * Math.PI) / satrec.no),
    // satellite.js documents epochyr as a four-digit year, but both of its loaders store
    // the two-digit TLE year (checked in sgp4.test.ts), so the TLE pivot applies.
    epochUtcMs: utcMsFromTleEpoch(satrec.epochyr, satrec.epochdays),
    satrec,
  };
}

function describeError(code: SatRecError): Sgp4Error {
  switch (code) {
    case SatRecError.MeanEccentricityOutOfRange:
      return 'mean-eccentricity-out-of-range';
    case SatRecError.MeanMotionBelowZero:
      return 'mean-motion-below-zero';
    case SatRecError.PerturbedEccentricityOutOfRange:
      return 'perturbed-eccentricity-out-of-range';
    case SatRecError.SemiLatusRectumBelowZero:
      return 'semi-latus-rectum-below-zero';
    case SatRecError.Decayed:
      return 'decayed';
    case SatRecError.None:
      throw new Error('SGP4 returned no state but reported no error');
  }
}
