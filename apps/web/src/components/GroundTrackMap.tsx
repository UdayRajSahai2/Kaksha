import { geoEquirectangular, geoGraticule, geoPath } from 'd3-geo';
import { useEffect, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';
import { latitude, longitude } from '../lib/format.ts';
import type { TrackPoint } from '../lib/groundTrack.ts';
import type { Mode } from '../lib/useMode.ts';
import styles from './GroundTrackMap.module.css';

type Props = {
  readonly past: TrackPoint[][];
  readonly future: TrackPoint[][];
  readonly point: TrackPoint | null;
  readonly periodMin: number | null;
  readonly mode: Mode;
};

const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);
const graticule = geoGraticule().step([30, 30])();
const sphere = { type: 'Sphere' } as const;

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function GroundTrackMap({ past, future, point, periodMin, mode }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)));
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mode is not read here, but switching it changes the CSS tokens the canvas reads, so the map must redraw.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || width === 0) return;
    const height = Math.round(width / 2);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = {
      water: token('--color-paper-3'),
      land: token('--color-rule'),
      coast: token('--color-rule-2'),
      grid: token('--color-rule'),
      past: token('--color-muted'),
      future: token('--color-cool'),
      halo: token('--color-paper-2'),
    };
    const projection = geoEquirectangular().fitSize([width, height], sphere);
    const path = geoPath(projection, ctx);

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    path(sphere);
    ctx.fillStyle = colors.water;
    ctx.fill();

    ctx.beginPath();
    path(graticule);
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.grid;
    ctx.stroke();

    ctx.beginPath();
    path(land);
    ctx.fillStyle = colors.land;
    ctx.fill();
    ctx.strokeStyle = colors.coast;
    ctx.lineWidth = 0.75;
    ctx.stroke();

    const drawTrack = (segments: TrackPoint[][], color: string, lineWidth: number) => {
      ctx.beginPath();
      for (const coordinates of segments) path({ type: 'LineString', coordinates });
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.stroke();
    };
    drawTrack(past, colors.past, 1.5);
    drawTrack(future, colors.future, 2);

    const xy = point ? projection(point) : null;
    if (xy) {
      const [x, y] = xy;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = colors.halo;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.future;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = colors.future;
      ctx.fill();
    }
  }, [width, past, future, point, mode]);

  const label = point
    ? `World map, equirectangular. The satellite is over ${latitude(point[1])}, ${longitude(point[0])}.`
    : 'World map, equirectangular. No position at the chosen time.';

  return (
    <section className="panel" aria-labelledby="map-title">
      <div className="panel__head">
        <h2 id="map-title">Ground track</h2>
        <span className="panel__meta">
          {periodMin
            ? `Half an orbit back, one orbit ahead (period ${periodMin.toFixed(1)} min)`
            : 'No track'}
        </span>
      </div>
      <div ref={wrapRef} className={styles.wrap}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={label} />
      </div>
      <div className="panel__foot">
        <ul className={styles.legend}>
          <li>
            <span className={`${styles.swatch} ${styles.swatchPast}`} aria-hidden="true" />
            Past half orbit
          </li>
          <li>
            <span className={`${styles.swatch} ${styles.swatchFuture}`} aria-hidden="true" />
            Next orbit
          </li>
          <li>
            <span className={styles.dot} aria-hidden="true" />
            Sub-satellite point now
          </li>
          <li className={styles.credit}>Equirectangular. Coastlines: Natural Earth 1:110m.</li>
        </ul>
      </div>
    </section>
  );
}
