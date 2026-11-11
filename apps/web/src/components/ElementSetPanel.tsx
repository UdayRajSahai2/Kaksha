import type { ParseResult } from '../lib/elementSet.ts';
import { utc } from '../lib/format.ts';
import { SAMPLES } from '../lib/samples.ts';

type Props = {
  readonly text: string;
  readonly parsed: ParseResult;
  readonly onText: (text: string) => void;
};

const CELESTRAK_ISS = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';

export function ElementSetPanel({ text, parsed, onText }: Props) {
  const empty = text.trim() === '';
  const error = !parsed.ok && !empty ? parsed.message : null;
  return (
    <section className="panel" aria-labelledby="elements-title">
      <div className="panel__head">
        <h2 id="elements-title">Element set</h2>
        {parsed.ok && <span className="panel__meta">{parsed.value.format}</span>}
      </div>
      <div className="panel__body">
        <div className="field">
          <label className="field__label" htmlFor="elements">
            Two-line elements or one OMM record (JSON)
          </label>
          <textarea
            id="elements"
            className="input"
            rows={4}
            spellCheck={false}
            autoComplete="off"
            value={text}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby="elements-message"
            onChange={(e) => onText(e.target.value)}
          />
          <p id="elements-message" className={error ? 'field__error' : 'field__help'}>
            {error ?? (
              <>
                For a current set, open{' '}
                <a href={CELESTRAK_ISS} target="_blank" rel="noopener noreferrer">
                  the ISS elements on CelesTrak
                </a>{' '}
                and paste all three lines.
              </>
            )}
          </p>
        </div>
        <fieldset className="field fieldset">
          <legend className="field__label">Samples from the SGP4 verification set</legend>
          <div className="button-row">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn"
                aria-pressed={text === s.text}
                onClick={() => onText(s.text)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        {parsed.ok ? (
          <dl className="facts">
            <dt>Name</dt>
            <dd>{parsed.value.name ?? 'Not given'}</dd>
            <dt>Catalogue number</dt>
            <dd className="measured cool">{parsed.value.satellite.noradId}</dd>
            <dt>Epoch</dt>
            <dd className="measured cool">{utc(parsed.value.satellite.epochUtcMs)}</dd>
            {parsed.value.checksumsValid !== null && (
              <>
                <dt>Checksums</dt>
                <dd>
                  {parsed.value.checksumsValid ? (
                    <span className="chip chip--ok">Both lines match</span>
                  ) : (
                    <span className="chip chip--bad">Mismatch: the lines may be damaged</span>
                  )}
                </dd>
              </>
            )}
            {parsed.value.recordCount > 1 && (
              <>
                <dt>Records</dt>
                <dd>First of {parsed.value.recordCount} used</dd>
              </>
            )}
          </dl>
        ) : (
          empty && (
            <div className="state" role="status">
              <p className="state__title">No element set</p>
              <p>Every position, track and vector on this page comes from one. Paste one or pick a sample.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
