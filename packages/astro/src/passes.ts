/**
 * Pass prediction (spec PASS-01, PASS-02, PASS-03): when a satellite is above a station's
 * elevation mask, found by a coarse step and refined by root finding.
 *
 * - Rise and set: bisection on elevation minus mask, to 1 ms.
 * - Culmination: golden-section search for maximum elevation, to 1 ms.
 * - Passes too short to show at any coarse sample are caught where sampled elevation has a
 *   local maximum below the mask: the true maximum is searched for between the neighbours.
 * - Visibility: the satellite is sunlit (cylindrical shadow) while the Sun is more than
 *   6 deg below the station's horizon (civil twilight), at any 10 s step of the pass.
 * Elevation is geometric (no refraction); see docs/known-limits.md.
 */
import { isSunlit } from './eclipse.ts';
import { temeToEcef } from './frames.ts';
import { bisect, goldenMax } from './roots.ts';
import { propagateTeme, type Sgp4Satellite } from './sgp4.ts';
import { sunPositionTemeKm } from './sun.ts';
import { type UtcMs, utcMs } from './time.ts';
import { type LookAngles, lookAngles, type Station } from './topocentric.ts';
import { type Deg, deg, degToRad, type Rad, rad, type Seconds, seconds } from './units.ts';
import { vec3 } from './vectors.ts';

export type PassEvent = { readonly t: UtcMs; readonly azimuthRad: Rad; readonly elevationRad: Rad };

export type Pass = {
  readonly rise: PassEvent;
  readonly culmination: PassEvent;
  readonly set: PassEvent;
  /** True when the window opened or closed with the satellite already above the mask. */
  readonly clippedByWindow: boolean;
  readonly durationS: Seconds;
  readonly visible: boolean;
};

export type PassOptions = {
  readonly minElevation: Deg;
  readonly stepS?: number;
};

const CIVIL_TWILIGHT = degToRad(deg(-6));
const VISIBILITY_STEP_MS = 10_000;
const TOLERANCE_MS = 1;

export function look(satellite: Sgp4Satellite, site: Station, t: UtcMs): LookAngles | null {
  const s = propagateTeme(satellite, t);
  if (!s.ok) return null;
  return lookAngles(site, temeToEcef(s.state.posTemeKm, s.state.velTemeKmS, t));
}

/** Elevation of the Sun at the station (geometric, Sun as a point). */
export function sunElevationRad(site: Station, t: UtcMs): Rad {
  const sun = sunPositionTemeKm(t);
  const sunEcef = temeToEcef(sun, vec3(0, 0, 0), t);
  return lookAngles(site, sunEcef).elevationRad;
}

export function predictPasses(
  satellite: Sgp4Satellite,
  site: Station,
  from: UtcMs,
  to: UtcMs,
  { minElevation, stepS = 30 }: PassOptions,
): Pass[] {
  const mask = degToRad(minElevation);
  const elevation = (t: number) => look(satellite, site, utcMs(t))?.elevationRad ?? -Math.PI / 2;
  const above = (t: number) => elevation(t) - mask;
  const step = stepS * 1000;

  const times: number[] = [];
  for (let t = Number(from); t < to; t += step) times.push(t);
  times.push(Number(to));
  const els = times.map(elevation);

  const spans: { rise: number; set: number; clipped: boolean }[] = [];
  let riseAt: number | null = (els[0] ?? -1) > mask ? Number(from) : null;
  let clipped = riseAt !== null;
  for (let i = 1; i < times.length; i++) {
    const a = times[i - 1] as number;
    const b = times[i] as number;
    const ea = els[i - 1] as number;
    const eb = els[i] as number;
    if (ea <= mask && eb > mask) {
      riseAt = bisect(above, a, b, TOLERANCE_MS);
    } else if (ea > mask && eb <= mask && riseAt !== null) {
      spans.push({ rise: riseAt, set: bisect(above, a, b, TOLERANCE_MS), clipped });
      riseAt = null;
      clipped = false;
    } else if (ea <= mask && eb <= mask && i + 1 < times.length) {
      // A short pass can peak above the mask between samples that are all below it.
      const ec = els[i + 1] as number;
      if (eb > ea && eb >= ec) {
        const c = times[i + 1] as number;
        const peak = goldenMax(elevation, a, c, TOLERANCE_MS);
        if (elevation(peak) > mask) {
          spans.push({
            rise: bisect(above, a, peak, TOLERANCE_MS),
            set: bisect(above, peak, c, TOLERANCE_MS),
            clipped: false,
          });
        }
      }
    }
  }
  if (riseAt !== null) spans.push({ rise: riseAt, set: Number(to), clipped: true });

  return spans.map(({ rise, set, clipped: clippedByWindow }) => {
    const peak = goldenMax(elevation, rise, set, TOLERANCE_MS);
    const event = (t: number): PassEvent => {
      const l = look(satellite, site, utcMs(t));
      return {
        t: utcMs(t),
        azimuthRad: l?.azimuthRad ?? rad(Number.NaN),
        elevationRad: l?.elevationRad ?? rad(Number.NaN),
      };
    };
    return {
      rise: event(rise),
      culmination: event(peak),
      set: event(set),
      clippedByWindow,
      durationS: seconds((set - rise) / 1000),
      visible: isVisible(satellite, site, rise, set),
    };
  });
}

function isVisible(satellite: Sgp4Satellite, site: Station, rise: number, set: number): boolean {
  for (let t = rise; t <= set; t += VISIBILITY_STEP_MS) {
    const at = utcMs(t);
    if (sunElevationRad(site, at) > CIVIL_TWILIGHT) continue;
    const s = propagateTeme(satellite, at);
    if (s.ok && isSunlit(s.state.posTemeKm, at)) return true;
  }
  return false;
}

/** Sky-plot track: azimuth and elevation every `stepS` seconds from rise to set (PASS-03). */
export function passTrack(satellite: Sgp4Satellite, site: Station, pass: Pass, stepS = 10): PassEvent[] {
  const points: PassEvent[] = [];
  for (let t = Number(pass.rise.t); t <= pass.set.t; t += stepS * 1000) {
    const l = look(satellite, site, utcMs(t));
    if (l) points.push({ t: utcMs(t), azimuthRad: l.azimuthRad, elevationRad: l.elevationRad });
  }
  return points;
}
