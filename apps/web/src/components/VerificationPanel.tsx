import {
  runSgp4Verification,
  VERIFICATION_POSITION_TOLERANCE_KM,
  VERIFICATION_VELOCITY_TOLERANCE_KM_S,
  type VerificationSummary,
} from '@kaksha/astro';
import casesText from '@kaksha/astro/fixtures/sgp4-verification/SGP4-VER.TLE?raw';
import referenceText from '@kaksha/astro/fixtures/sgp4-verification/tcppver.out?raw';
import { useEffect, useState } from 'react';
import { mm } from '../lib/format.ts';
import styles from './VerificationPanel.module.css';

type State =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'done'; readonly summary: VerificationSummary; readonly ms: number };

const mmPerS = (kmPerS: number) => `${kmPerS === 0 ? '0' : (kmPerS * 1e6).toPrecision(2)} mm/s`;

export function VerificationPanel() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    // After first paint, so the rest of the page is usable while the 666 points run.
    const id = window.setTimeout(() => {
      const start = performance.now();
      try {
        const summary = runSgp4Verification(casesText, referenceText);
        setState({ status: 'done', summary, ms: performance.now() - start });
      } catch (error) {
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section className="panel" id="verification" aria-labelledby="verification-title">
      <div className="panel__head">
        <h2 id="verification-title">SGP4 against the published verification vectors</h2>
        <span className="panel__meta">
          {state.status === 'done'
            ? `Run in this browser in ${Math.max(1, Math.round(state.ms))} ms`
            : 'Vallado et al. 2006'}
        </span>
      </div>
      {state.status === 'loading' && (
        <div className="state" role="status" aria-label="Running the verification cases">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}
      {state.status === 'error' && (
        <div className="state" role="alert">
          <p className="state__title">The verification run failed</p>
          <p>
            {state.message}. The tests in packages/astro report the same run; run pnpm test to see which case
            broke.
          </p>
        </div>
      )}
      {state.status === 'done' && <Results summary={state.summary} />}
      <p className="panel__foot">
        Tolerance {mm(VERIFICATION_POSITION_TOLERANCE_KM)} in position and{' '}
        {mmPerS(VERIFICATION_VELOCITY_TOLERANCE_KM_S)} in velocity, 100 times the reference’s printed
        precision. This checks the code against Vallado’s reference implementation, not SGP4 against reality.
        The same run is a CI test.
      </p>
    </section>
  );
}

function Results({ summary }: { readonly summary: VerificationSummary }) {
  const figures = [
    { label: 'Cases', value: String(summary.cases.length) },
    { label: 'Points compared', value: String(summary.points) },
    { label: 'Max position error', value: mm(summary.maxPosErrKm) },
    { label: 'RMS position error', value: mm(summary.rmsPosErrKm) },
    { label: 'Max velocity error', value: mmPerS(summary.maxVelErrKmS) },
  ];
  return (
    <>
      <dl className={styles.figures}>
        {figures.map((f) => (
          <div key={f.label} className={styles.figure}>
            <dt>{f.label}</dt>
            <dd className={styles.value}>{f.value}</dd>
          </div>
        ))}
        <div className={styles.figure}>
          <dt>Result</dt>
          <dd className={styles.verdict}>
            {summary.allWithinTolerance ? (
              <span className="chip chip--ok">All within tolerance</span>
            ) : (
              <span className="chip chip--bad">Outside tolerance</span>
            )}
          </dd>
        </div>
      </dl>
      <div className="table-wrap">
        <table className="table">
          <caption className="visually-hidden">
            Per-case results of SGP4 against the verification vectors
          </caption>
          <thead>
            <tr>
              <th scope="col">Catalogue number</th>
              <th scope="col" className="num">
                Span (min)
              </th>
              <th scope="col" className="num">
                Points
              </th>
              <th scope="col" className="num">
                Max position error
              </th>
              <th scope="col" className="num">
                Max velocity error
              </th>
              <th scope="col">How the case ends</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {summary.cases.map((c) => (
              <tr key={`${c.satnum}-${c.startMin}`}>
                <th scope="row" className="measured">
                  {c.satnum}
                </th>
                <td className="num">
                  {c.startMin} to {c.stopMin}
                </td>
                <td className="num">{c.points}</td>
                <td className="num">{mm(c.maxPosErrKm)}</td>
                <td className="num">{mmPerS(c.maxVelErrKmS)}</td>
                <td>{c.ending}</td>
                <td>
                  {c.withinTolerance ? (
                    <span className="chip chip--ok">Pass</span>
                  ) : (
                    <span className="chip chip--bad">Fail</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
