import type { EclipseInterval, Geodetic } from '@kaksha/astro';
import { radToDeg } from '@kaksha/astro';
import { age, latitude, longitude, utc, withUnit } from '../lib/format.ts';
import styles from './Reading.module.css';

type Props = {
  readonly title: string;
  readonly geodetic: Geodetic | null;
  readonly error: string | null;
  readonly tMs: number;
  readonly epochMs: number;
  readonly sunlit: boolean | null;
  readonly nextShadow: EclipseInterval | null;
};

/** Days of element age past which the reading carries a staleness note. */
const STALE_DAYS = 3;

export function Reading({ title, geodetic, error, tMs, epochMs, sunlit, nextShadow }: Props) {
  const ageMs = tMs - epochMs;
  const stale = Math.abs(ageMs) > STALE_DAYS * 86_400_000;
  return (
    <section className="panel" aria-labelledby="reading-title">
      <div className="panel__head">
        <h2 id="reading-title">Sub-satellite point</h2>
        <span className="panel__meta">{title}</span>
      </div>
      {geodetic ? (
        <dl className={styles.figures}>
          <div className={styles.figure}>
            <dt>Latitude</dt>
            <dd className={styles.value}>{latitude(radToDeg(geodetic.latRad))}</dd>
          </div>
          <div className={styles.figure}>
            <dt>Longitude</dt>
            <dd className={styles.value}>{longitude(radToDeg(geodetic.lonRad))}</dd>
          </div>
          <div className={styles.figure}>
            <dt>Height above WGS-84</dt>
            <dd className={styles.value}>{withUnit(geodetic.altKm, 1, 'km')}</dd>
          </div>
        </dl>
      ) : (
        <div className="state" role="status">
          <p className="state__title">No position at this time</p>
          <p>{error}</p>
        </div>
      )}
      <div className="panel__body">
        <dl className="facts">
          <dt>Chosen time</dt>
          <dd className="measured person">{utc(tMs)}</dd>
          <dt>Element epoch</dt>
          <dd className="measured cool">{utc(epochMs)}</dd>
          <dt>Element age</dt>
          <dd className="measured">
            {age(ageMs)} {stale && <span className="chip chip--person">Out of date for this time</span>}
          </dd>
          {sunlit !== null && (
            <>
              <dt>Illumination</dt>
              <dd>{sunlit ? 'Sunlit' : 'In the Earth’s shadow'}</dd>
              <dt>{sunlit ? 'Next shadow' : 'Shadow'}</dt>
              <dd className="measured">
                {nextShadow
                  ? `${nextShadow.entry ? utc(nextShadow.entry) : 'now'} to ${nextShadow.exit ? utc(nextShadow.exit) : 'beyond one orbit'}`
                  : 'none within one orbit'}
              </dd>
            </>
          )}
        </dl>
        {stale && (
          <p>
            SGP4 error grows by kilometres per day of element age, so this position is a rough guide. Use
            elements published close to the time you choose.
          </p>
        )}
      </div>
      <p className="panel__foot">
        Shown to about 100 m; SGP4 on public elements is good to about 1 km at epoch. SGP4 (satellite.js
        7.1.0), TEME to Earth-fixed by GMST (IAU-1982), WGS-84 ellipsoid. Shadow: cylindrical model, no
        penumbra.
      </p>
    </section>
  );
}
