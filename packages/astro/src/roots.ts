/** One-dimensional root finding and maximisation over time (milliseconds), for events. */

/**
 * A root of f between a and b, where f(a) and f(b) have opposite signs, to `toleranceMs`.
 * Bisection: slower than Brent but cannot leave the bracket, and 30 s brackets need only
 * about 18 halvings to reach 0.1 ms.
 */
export function bisect(f: (t: number) => number, a: number, b: number, toleranceMs: number): number {
  let lo = a;
  let hi = b;
  const loNegative = f(lo) < 0;
  while (hi - lo > toleranceMs) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0 === loNegative) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const INV_PHI = (Math.sqrt(5) - 1) / 2;

/** The time of the maximum of a unimodal f on [a, b], to `toleranceMs` (golden-section search). */
export function goldenMax(f: (t: number) => number, a: number, b: number, toleranceMs: number): number {
  let lo = a;
  let hi = b;
  let x1 = hi - INV_PHI * (hi - lo);
  let x2 = lo + INV_PHI * (hi - lo);
  let f1 = f(x1);
  let f2 = f(x2);
  while (hi - lo > toleranceMs) {
    if (f1 < f2) {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + INV_PHI * (hi - lo);
      f2 = f(x2);
    } else {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - INV_PHI * (hi - lo);
      f1 = f(x1);
    }
  }
  return (lo + hi) / 2;
}
