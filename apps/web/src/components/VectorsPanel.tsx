import { type EcefState, magnitude, type Rad, radToDeg, type TemeState } from '@kaksha/astro';
import { fixed } from '../lib/format.ts';

type Props = {
  readonly teme: TemeState | null;
  readonly ecef: EcefState | null;
  readonly gmstRad: Rad | null;
};

type Row = {
  label: string;
  unit: string;
  digits: number;
  v: { x: number; y: number; z: number };
  norm: number;
};

export function VectorsPanel({ teme, ecef, gmstRad }: Props) {
  const rows: Row[] =
    teme && ecef
      ? [
          {
            label: 'Position, TEME',
            unit: 'km',
            digits: 3,
            v: teme.posTemeKm,
            norm: magnitude(teme.posTemeKm),
          },
          {
            label: 'Velocity, TEME',
            unit: 'km/s',
            digits: 6,
            v: teme.velTemeKmS,
            norm: magnitude(teme.velTemeKmS),
          },
          {
            label: 'Position, Earth-fixed',
            unit: 'km',
            digits: 3,
            v: ecef.posEcefKm,
            norm: magnitude(ecef.posEcefKm),
          },
          {
            label: 'Velocity, Earth-fixed',
            unit: 'km/s',
            digits: 6,
            v: ecef.velEcefKmS,
            norm: magnitude(ecef.velEcefKmS),
          },
        ]
      : [];
  return (
    <section className="panel" aria-labelledby="vectors-title">
      <div className="panel__head">
        <h2 id="vectors-title">State vectors</h2>
        <span className="panel__meta">
          {gmstRad === null ? (
            'No state'
          ) : (
            <span className="measured">GMST {fixed(radToDeg(gmstRad), 6)}°</span>
          )}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="state" role="status">
          <p className="state__title">No state at this time</p>
          <p>Load an element set and choose a time SGP4 can reach.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Vector</th>
                <th scope="col" className="num">
                  x
                </th>
                <th scope="col" className="num">
                  y
                </th>
                <th scope="col" className="num">
                  z
                </th>
                <th scope="col" className="num">
                  Magnitude
                </th>
                <th scope="col">Unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td className="num">{fixed(r.v.x, r.digits)}</td>
                  <td className="num">{fixed(r.v.y, r.digits)}</td>
                  <td className="num">{fixed(r.v.z, r.digits)}</td>
                  <td className="num">{fixed(r.norm, r.digits)}</td>
                  <td>{r.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="panel__foot">
        Computed values at full working precision; the model itself is good to about 1 km at epoch.
        Earth-fixed means PEF: polar motion and UT1 − UTC are ignored.
      </p>
    </section>
  );
}
