import { dopplerShiftHz, hz, kmPerS } from '@kaksha/astro';
import { fixed } from '../lib/format.ts';
import type { PassSample } from '../lib/passSamples.ts';
import styles from './PassPlots.module.css';

const DEG = 180 / Math.PI;

/** Polar sky plot: zenith at the centre, horizon at the rim, north up, east to the right. */
export function SkyPlot({ samples, maskDeg }: { readonly samples: PassSample[]; readonly maskDeg: number }) {
  const size = 240;
  const c = size / 2;
  const radius = c - 20;
  const xy = (azRad: number, elRad: number) => {
    const r = ((90 - elRad * DEG) / 90) * radius;
    return [c + r * Math.sin(azRad), c - r * Math.cos(azRad)] as const;
  };
  const path = samples
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${xy(s.azimuthRad, s.elevationRad).join(',')}`)
    .join('');
  const first = samples[0];
  const last = samples.at(-1);
  return (
    <figure className={styles.figure}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={styles.sky}
        role="img"
        aria-label="Sky plot of the pass: azimuth around, elevation inward"
      >
        <circle cx={c} cy={c} r={radius} className={styles.horizon} />
        {[30, 60].map((el) => (
          <circle key={el} cx={c} cy={c} r={((90 - el) / 90) * radius} className={styles.grid} />
        ))}
        <circle cx={c} cy={c} r={((90 - maskDeg) / 90) * radius} className={styles.mask} />
        <line x1={c} y1={c - radius} x2={c} y2={c + radius} className={styles.grid} />
        <line x1={c - radius} y1={c} x2={c + radius} y2={c} className={styles.grid} />
        {(
          [
            ['N', 0],
            ['E', 90],
            ['S', 180],
            ['W', 270],
          ] as const
        ).map(([label, az]) => {
          const [x, y] = xy(az / DEG, -12 / DEG);
          return (
            <text
              key={label}
              x={x}
              y={y}
              className={styles.label}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>
          );
        })}
        <path d={path} className={styles.track} />
        {first && (
          <circle {...point(xy(first.azimuthRad, first.elevationRad))} r={4} className={styles.rise} />
        )}
        {last && <circle {...point(xy(last.azimuthRad, last.elevationRad))} r={4} className={styles.set} />}
      </svg>
      <figcaption className={styles.caption}>
        Rings at 0°, 30° and 60° elevation; dashed ring is the {maskDeg}° mask. Filled dot rise, open dot set.
      </figcaption>
    </figure>
  );
}

const point = ([cx, cy]: readonly [number, number]) => ({ cx, cy });

type LineProps = {
  readonly samples: PassSample[];
  readonly value: (s: PassSample) => number;
  readonly label: string;
  readonly unit: string;
  readonly digits: number;
};

/** A small time-series line with a zero-based or symmetric axis, labelled at min and max. */
function Line({ samples, value, label, unit, digits }: LineProps) {
  const w = 320;
  const h = 120;
  const pad = 8;
  const values = samples.map(value);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const t0 = samples[0]?.tMs ?? 0;
  const t1 = samples.at(-1)?.tMs ?? 1;
  const x = (t: number) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (w - 2 * pad);
  const y = (v: number) => h - pad - ((v - lo) / Math.max(1e-12, hi - lo)) * (h - 2 * pad);
  const d = samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.tMs)},${y(value(s))}`).join('');
  return (
    <figure className={styles.figure}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className={styles.line}
        role="img"
        aria-label={`${label} over the pass`}
      >
        <line
          x1={pad}
          x2={w - pad}
          y1={y(0)}
          y2={y(0)}
          className={styles.grid}
          vectorEffect="non-scaling-stroke"
        />
        <path d={d} className={styles.track} vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className={styles.caption}>
        {label}, rise to set. Range {fixed(Math.min(...values), digits)} to{' '}
        {fixed(Math.max(...values), digits)}
        {' '}
        {unit}; the rule marks zero.
      </figcaption>
    </figure>
  );
}

export function PassCurves({
  samples,
  frequencyMhz,
}: {
  readonly samples: PassSample[];
  readonly frequencyMhz: number;
}) {
  return (
    <>
      <Line samples={samples} value={(s) => s.elevationRad * DEG} label="Elevation" unit="°" digits={1} />
      <Line
        samples={samples}
        value={(s) => dopplerShiftHz(hz(frequencyMhz * 1e6), kmPerS(s.rangeRateKmS)) / 1000}
        label={`Doppler shift at ${frequencyMhz} MHz`}
        unit="kHz"
        digits={2}
      />
    </>
  );
}
