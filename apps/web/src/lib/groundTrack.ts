import {
  ecefToGeodetic,
  propagateTeme,
  radToDeg,
  type Sgp4Satellite,
  temeToEcef,
  type UtcMs,
  utcMs,
} from '@kaksha/astro';

/** [longitude, latitude] in degrees, the order d3-geo expects. */
export type TrackPoint = [number, number];

/**
 * Sub-satellite points from `fromMin` to `toMin` minutes around `t`, one every `stepS` seconds.
 * A step where SGP4 fails ends the current segment, so a gap is drawn as a gap.
 */
export function groundTrack(
  satellite: Sgp4Satellite,
  t: UtcMs,
  fromMin: number,
  toMin: number,
  stepS: number,
): TrackPoint[][] {
  const segments: TrackPoint[][] = [];
  let current: TrackPoint[] = [];
  for (let s = fromMin * 60; s <= toMin * 60; s += stepS) {
    const at = utcMs(t + s * 1000);
    const result = propagateTeme(satellite, at);
    if (!result.ok) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }
    const { posEcefKm } = temeToEcef(result.state.posTemeKm, result.state.velTemeKmS, at);
    const g = ecefToGeodetic(posEcefKm);
    current.push([radToDeg(g.lonRad), radToDeg(g.latRad)]);
  }
  if (current.length > 1) segments.push(current);
  return segments;
}
