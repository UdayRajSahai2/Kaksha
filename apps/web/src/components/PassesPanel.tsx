import {
  deg,
  degToRad,
  km,
  type Pass,
  predictPasses,
  type Rad,
  radToDeg,
  type Sgp4Satellite,
  station,
  utcMs,
} from '@kaksha/astro';
import { useMemo, useState } from 'react';
import { fixed, utc } from '../lib/format.ts';
import { passSamples } from '../lib/passSamples.ts';
import { PassCurves, SkyPlot } from './PassPlots.tsx';

type StationInput = { name: string; latDeg: string; lonDeg: string; heightKm: string; maskDeg: string };

const KEY = 'kaksha-station';
const DEFAULT: StationInput = {
  name: 'Bengaluru',
  latDeg: '12.9716',
  lonDeg: '77.5946',
  heightKm: '0.92',
  maskDeg: '10',
};
const WINDOW_MS = 86_400_000;

function loadStation(): StationInput {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as StationInput | null;
    return saved && typeof saved.latDeg === 'string' ? saved : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function parseStation(s: StationInput) {
  const lat = Number(s.latDeg);
  const lon = Number(s.lonDeg);
  const h = Number(s.heightKm);
  const mask = Number(s.maskDeg);
  if (s.latDeg.trim() === '' || !Number.isFinite(lat) || Math.abs(lat) > 90)
    return 'Latitude must be between −90 and 90 degrees.';
  if (s.lonDeg.trim() === '' || !Number.isFinite(lon) || Math.abs(lon) > 180)
    return 'Longitude must be between −180 and 180 degrees.';
  if (!Number.isFinite(h) || h < -0.5 || h > 9) return 'Height must be between −0.5 and 9 km.';
  if (!Number.isFinite(mask) || mask < 0 || mask > 60) return 'Mask must be between 0 and 60 degrees.';
  return {
    site: station({ latRad: degToRad(deg(lat)), lonRad: degToRad(deg(lon)), altKm: km(h) }),
    maskDeg: mask,
  };
}

const azText = (angle: Rad) => `${fixed(radToDeg(angle), 0)}°`;

export function PassesPanel({
  satellite,
  tMs,
}: {
  readonly satellite: Sgp4Satellite | null;
  readonly tMs: number;
}) {
  const [input, setInput] = useState<StationInput>(loadStation);
  const [frequencyMhz, setFrequencyMhz] = useState('437');
  const [selected, setSelected] = useState(0);
  const parsed = useMemo(() => parseStation(input), [input]);
  const windowStart = Math.floor(tMs / 60_000) * 60_000;

  const passes: Pass[] = useMemo(() => {
    if (!satellite || typeof parsed === 'string') return [];
    return predictPasses(satellite, parsed.site, utcMs(windowStart), utcMs(windowStart + WINDOW_MS), {
      minElevation: deg(parsed.maskDeg),
    });
  }, [satellite, parsed, windowStart]);

  const update = (field: keyof StationInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...input, [field]: e.target.value };
    setInput(next);
    setSelected(0);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage may be refused; the station then lasts for this visit only.
    }
  };

  const current = passes[selected];
  const samples =
    satellite && current && typeof parsed !== 'string' ? passSamples(satellite, parsed.site, current) : [];
  const freq = Number(frequencyMhz);

  return (
    <section className="panel" aria-labelledby="passes-title">
      <div className="panel__head">
        <h2 id="passes-title">Passes over a ground station</h2>
        <span className="panel__meta">Next 24 h from the chosen time</span>
      </div>
      <div className="panel__body">
        <fieldset className="fieldset station-grid">
          <legend className="field__label">Station, WGS-84 (stored in this browser only)</legend>
          {(
            [
              ['name', 'Name', 'text'],
              ['latDeg', 'Latitude (°, north +)', 'decimal'],
              ['lonDeg', 'Longitude (°, east +)', 'decimal'],
              ['heightKm', 'Height (km)', 'decimal'],
              ['maskDeg', 'Elevation mask (°)', 'decimal'],
            ] as const
          ).map(([field, label, mode]) => (
            <div key={field} className="field">
              <label className="field__label" htmlFor={`station-${field}`}>
                {label}
              </label>
              <input
                id={`station-${field}`}
                className="input"
                inputMode={mode === 'decimal' ? 'decimal' : 'text'}
                autoComplete="off"
                value={input[field]}
                onChange={update(field)}
              />
            </div>
          ))}
        </fieldset>
        {typeof parsed === 'string' && (
          <p className="field__error" role="alert">
            {parsed}
          </p>
        )}
      </div>
      {!satellite || typeof parsed === 'string' ? null : passes.length === 0 ? (
        <div className="state" role="status">
          <p className="state__title">No passes above {parsed.maskDeg}° in the next 24 hours</p>
          <p>Lower the mask, or check the orbit: a geostationary satellite never rises or sets.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <caption className="visually-hidden">Passes in the next 24 hours</caption>
              <thead>
                <tr>
                  <th scope="col">Rise (UTC)</th>
                  <th scope="col" className="num">
                    Rise az
                  </th>
                  <th scope="col" className="num">
                    Max elevation
                  </th>
                  <th scope="col" className="num">
                    Set az
                  </th>
                  <th scope="col" className="num">
                    Duration
                  </th>
                  <th scope="col">Visible to the eye</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {passes.map((p, i) => (
                  <tr key={Number(p.rise.t)}>
                    <th scope="row" className="measured">
                      {p.clippedByWindow && i === 0 ? 'In progress' : utc(p.rise.t)}
                    </th>
                    <td className="num">{azText(p.rise.azimuthRad)}</td>
                    <td className="num">{fixed(radToDeg(p.culmination.elevationRad), 1)}°</td>
                    <td className="num">{azText(p.set.azimuthRad)}</td>
                    <td className="num">
                      {fixed(p.durationS / 60, 1)}
                      {' '}min
                    </td>
                    <td>{p.visible ? <span className="chip chip--ok">Yes</span> : 'No'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn"
                        aria-pressed={i === selected}
                        onClick={() => setSelected(i)}
                      >
                        Show
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {current && samples.length > 1 && (
            <div className="panel__body pass-detail">
              <SkyPlot samples={samples} maskDeg={parsed.maskDeg} />
              <div className="pass-curves">
                <div className="field">
                  <label className="field__label" htmlFor="frequency">
                    Downlink frequency (MHz)
                  </label>
                  <input
                    id="frequency"
                    className="input"
                    inputMode="decimal"
                    value={frequencyMhz}
                    onChange={(e) => setFrequencyMhz(e.target.value)}
                  />
                </div>
                {Number.isFinite(freq) && freq > 0 ? (
                  <PassCurves samples={samples} frequencyMhz={freq} />
                ) : (
                  <p className="field__error">Enter a frequency above 0 MHz.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <p className="panel__foot">
        Coarse 30 s step, rise, set and peak refined to 1 ms; checked against Skyfield to 0.17 s. Elevation is
        geometric (no refraction). Visible means the satellite is sunlit (cylindrical shadow) while the Sun is
        6° or more below the station’s horizon.
      </p>
    </section>
  );
}
