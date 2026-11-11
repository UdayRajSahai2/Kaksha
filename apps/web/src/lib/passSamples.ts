import { look, type Pass, type Sgp4Satellite, type Station, utcMs } from '@kaksha/astro';

export type PassSample = {
  readonly tMs: number;
  readonly azimuthRad: number;
  readonly elevationRad: number;
  readonly rangeRateKmS: number;
};

/** Look angles and range rate from rise to set every `stepS` seconds, set included. */
export function passSamples(satellite: Sgp4Satellite, site: Station, pass: Pass, stepS = 5): PassSample[] {
  const samples: PassSample[] = [];
  const end = Number(pass.set.t);
  for (let t = Number(pass.rise.t); ; t = Math.min(t + stepS * 1000, end)) {
    const l = look(satellite, site, utcMs(t));
    if (l) {
      samples.push({
        tMs: t,
        azimuthRad: l.azimuthRad,
        elevationRad: l.elevationRad,
        rangeRateKmS: l.rangeRateKmS,
      });
    }
    if (t >= end) break;
  }
  return samples;
}
