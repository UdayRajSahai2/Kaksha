import { useCallback, useEffect, useState } from 'react';

export type Mode = 'light' | 'dark';
const KEY = 'kaksha-mode';
const query = () => window.matchMedia('(prefers-color-scheme: light)');

function stored(): Mode | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** The colour mode in effect: the visitor's choice if made, else the system's. */
export function useMode(): { mode: Mode; toggle: () => void } {
  const [chosen, setChosen] = useState<Mode | null>(stored);
  const [system, setSystem] = useState<Mode>(() => (query().matches ? 'light' : 'dark'));

  useEffect(() => {
    const mq = query();
    const onChange = () => setSystem(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const mode = chosen ?? system;
  const toggle = useCallback(() => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.mode = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private windows may refuse storage; the choice then lasts for this visit.
    }
    setChosen(next);
  }, [mode]);

  return { mode, toggle };
}
