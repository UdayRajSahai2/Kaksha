import { useEffect, useState } from 'react';
import { isoUtc } from '../lib/format.ts';
import { parseUtc } from '../lib/parseUtc.ts';

export type TimeChoice =
  | { readonly kind: 'now' }
  | { readonly kind: 'epoch' }
  | { readonly kind: 'at'; readonly ms: number };

type Props = {
  readonly choice: TimeChoice;
  readonly tMs: number;
  readonly hasEpoch: boolean;
  readonly onChoice: (choice: TimeChoice) => void;
};

const STEP_MS = 10 * 60_000;

export function TimePanel({ choice, tMs, hasEpoch, onChoice }: Props) {
  const [draft, setDraft] = useState(isoUtc(tMs));
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(isoUtc(tMs));
  }, [tMs, editing]);

  const commit = () => {
    setEditing(false);
    if (draft === isoUtc(tMs)) return;
    const ms = parseUtc(draft);
    if (ms === null) {
      setError('Use a UTC time ending in Z, such as 2026-11-11T06:00:00Z.');
      return;
    }
    setError(null);
    onChoice({ kind: 'at', ms });
  };

  return (
    <section className="panel" aria-labelledby="time-title">
      <div className="panel__head">
        <h2 id="time-title">Time</h2>
        <span className="panel__meta">{choice.kind === 'now' ? 'Following the clock' : 'Fixed'}</span>
      </div>
      <div className="panel__body">
        <form
          className="field"
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          <label className="field__label" htmlFor="time">
            Propagate to (UTC)
          </label>
          <input
            id="time"
            className="input"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby="time-message"
            onFocus={() => setEditing(true)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
          />
          <p id="time-message" className={error ? 'field__error' : 'field__help'}>
            {error ?? 'Press Enter to apply. Times are UTC, never local.'}
          </p>
        </form>
        <div className="button-row">
          <button
            type="button"
            className="btn"
            aria-pressed={choice.kind === 'now'}
            onClick={() => onChoice({ kind: 'now' })}
          >
            Now, live
          </button>
          <button
            type="button"
            className="btn"
            aria-pressed={choice.kind === 'epoch'}
            disabled={!hasEpoch}
            onClick={() => onChoice({ kind: 'epoch' })}
          >
            Element epoch
          </button>
          <button type="button" className="btn" onClick={() => onChoice({ kind: 'at', ms: tMs - STEP_MS })}>
            Back 10 min
          </button>
          <button type="button" className="btn" onClick={() => onChoice({ kind: 'at', ms: tMs + STEP_MS })}>
            Forward 10 min
          </button>
        </div>
      </div>
    </section>
  );
}
