import {
  ecefToGeodetic,
  eclipseIntervals,
  gmstRad,
  isSunlit,
  propagateTeme,
  radToDeg,
  type Sgp4Error,
  temeToEcef,
  utcMs,
} from '@kaksha/astro';
import { useEffect, useMemo, useState } from 'react';
import { ElementSetPanel } from './components/ElementSetPanel.tsx';
import { GroundTrackMap } from './components/GroundTrackMap.tsx';
import { Mark } from './components/Mark.tsx';
import { PassesPanel } from './components/PassesPanel.tsx';
import { Reading } from './components/Reading.tsx';
import { type TimeChoice, TimePanel } from './components/TimePanel.tsx';
import { VectorsPanel } from './components/VectorsPanel.tsx';
import { VerificationPanel } from './components/VerificationPanel.tsx';
import { parseElementSet } from './lib/elementSet.ts';
import { utc } from './lib/format.ts';
import { groundTrack, type TrackPoint } from './lib/groundTrack.ts';
import { parseUtc } from './lib/parseUtc.ts';
import { SAMPLES } from './lib/samples.ts';
import { useMode } from './lib/useMode.ts';

const KNOWN_LIMITS = 'https://github.com/UdayRajSahai2/Kaksha/blob/main/docs/known-limits.md';

const SGP4_MESSAGES: Record<Sgp4Error, string> = {
  decayed: 'SGP4 reports the object has decayed by this time. Choose a time closer to the element epoch.',
  'mean-eccentricity-out-of-range':
    'The orbit has drifted outside what SGP4 can model by this time. Choose a time closer to the element epoch.',
  'mean-motion-below-zero':
    'SGP4 cannot model the orbit at this time. Choose a time closer to the element epoch.',
  'perturbed-eccentricity-out-of-range':
    'The orbit has drifted outside what SGP4 can model by this time. Choose a time closer to the element epoch.',
  'semi-latus-rectum-below-zero':
    'SGP4 cannot model the orbit at this time. Choose a time closer to the element epoch.',
};

function readUrl(): { text: string; choice: TimeChoice } {
  const params = new URLSearchParams(window.location.search);
  const text = params.get('elements') ?? SAMPLES[0]?.text ?? '';
  const t = params.get('t');
  const ms = t ? parseUtc(t) : null;
  const choice: TimeChoice =
    t === 'now' ? { kind: 'now' } : ms !== null ? { kind: 'at', ms } : { kind: 'epoch' };
  return { text, choice };
}

export function App() {
  const initial = useMemo(readUrl, []);
  const [text, setText] = useState(initial.text);
  const [choice, setChoice] = useState<TimeChoice>(initial.choice);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { mode, toggle } = useMode();

  useEffect(() => {
    if (choice.kind !== 'now') return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [choice.kind]);

  const parsed = useMemo(() => parseElementSet(text), [text]);
  const satellite = parsed.ok ? parsed.value.satellite : null;
  const tMs =
    choice.kind === 'now' ? nowMs : choice.kind === 'at' ? choice.ms : (satellite?.epochUtcMs ?? nowMs);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('elements', text);
    if (choice.kind === 'now') params.set('t', 'now');
    if (choice.kind === 'at') params.set('t', new Date(choice.ms).toISOString());
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
  }, [text, choice]);

  const state = useMemo(() => {
    if (!satellite) return null;
    const t = utcMs(tMs);
    const result = propagateTeme(satellite, t);
    if (!result.ok) return { error: SGP4_MESSAGES[result.error] } as const;
    const ecef = temeToEcef(result.state.posTemeKm, result.state.velTemeKmS, t);
    const next = eclipseIntervals(satellite, t, utcMs(t + satellite.periodMin * 60_000))[0] ?? null;
    return {
      teme: result.state,
      ecef,
      geodetic: ecefToGeodetic(ecef.posEcefKm),
      gmst: gmstRad(t),
      sunlit: isSunlit(result.state.posTemeKm, t),
      nextShadow: next,
    } as const;
  }, [satellite, tMs]);

  const track = useMemo(() => {
    if (!satellite) return { past: [], future: [] };
    const period = satellite.periodMin;
    const stepS = Math.min(300, Math.max(10, (period * 60) / 240));
    const t = utcMs(tMs);
    return {
      past: groundTrack(satellite, t, -period / 2, 0, stepS),
      future: groundTrack(satellite, t, 0, period, stepS),
    };
  }, [satellite, tMs]);

  const geodetic = state && 'geodetic' in state ? state.geodetic : null;
  const point: TrackPoint | null = geodetic ? [radToDeg(geodetic.lonRad), radToDeg(geodetic.latRad)] : null;
  const title = parsed.ok
    ? (parsed.value.name ?? `Catalogue ${parsed.value.satellite.noradId}`)
    : 'No element set';

  return (
    <>
      <header className="topbar">
        <div className="container topbar__inner">
          <a className="wordmark" href="/" aria-label="Kaksha, astro workbench home">
            <Mark size={28} />
            kaksha
          </a>
          <h1 className="topbar__page">Astro workbench</h1>
          <nav className="topbar__end" aria-label="Page">
            <a className="topbar__link topbar__link--inpage" href="#verification">
              Verification
            </a>
            <a className="topbar__link" href={KNOWN_LIMITS} target="_blank" rel="noopener noreferrer">
              Known limits
            </a>
            <button type="button" className="btn" onClick={toggle}>
              {mode === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </nav>
        </div>
      </header>

      <main className="container main">
        <div className="workspace">
          <div className="column">
            <ElementSetPanel text={text} parsed={parsed} onText={setText} />
            <TimePanel choice={choice} tMs={tMs} hasEpoch={satellite !== null} onChoice={setChoice} />
          </div>
          <div className="column">
            {satellite ? (
              <Reading
                title={title}
                geodetic={geodetic}
                error={state && 'error' in state ? state.error : null}
                tMs={tMs}
                epochMs={satellite.epochUtcMs}
                sunlit={state && 'sunlit' in state ? state.sunlit : null}
                nextShadow={state && 'nextShadow' in state ? state.nextShadow : null}
              />
            ) : (
              <section className="panel" aria-label="Sub-satellite point">
                <div className="state">
                  <p className="state__title">Nothing to show yet</p>
                  <p>Load an element set on the left; the position, track and vectors appear here.</p>
                </div>
              </section>
            )}
            <GroundTrackMap
              past={track.past}
              future={track.future}
              point={point}
              periodMin={satellite?.periodMin ?? null}
              mode={mode}
            />
            <VectorsPanel
              teme={state && 'teme' in state ? state.teme : null}
              ecef={state && 'ecef' in state ? state.ecef : null}
              gmstRad={state && 'gmst' in state ? state.gmst : null}
            />
          </div>
        </div>
        <PassesPanel satellite={satellite} tMs={tMs} />
        <VerificationPanel />
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <p>
            Screening-grade and not for operational use. Positions come from SGP4 on public element sets,
            typically good to about a kilometre at epoch and worse as the elements age.{' '}
            <a href={KNOWN_LIMITS} target="_blank" rel="noopener noreferrer">
              What the models ignore
            </a>
            .
          </p>
          <p>
            Element set:{' '}
            {parsed.ok ? `${title}, epoch ${utc(parsed.value.satellite.epochUtcMs)}` : 'none loaded'}. Model:
            SGP4 (satellite.js 7.1.0). Coastlines: Natural Earth.
          </p>
        </div>
      </footer>
    </>
  );
}
