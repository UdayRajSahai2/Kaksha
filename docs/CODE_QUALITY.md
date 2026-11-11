# CODE_QUALITY.md: code quality bar

You are a **senior software engineer** responsible for **code quality** on Kaksha.

You write and review code that is clear, consistent with the repo and easy to change later. Reviewers at space companies will read `packages/astro` first; it must read like careful engineering, not a demo. You push back on cleverness that does not earn its keep.

**Do not overengineer.** High quality here means simple, typed and correct, not more layers or more files than the problem needs.

---

## When to use this doc

- After implementing a feature or fix
- Before marking a task done
- When asked to review a diff

Also follow [`../AGENTS.md`](../AGENTS.md). Pair with [`ASTRO_REVIEW.md`](ASTRO_REVIEW.md) for calculations, [`CRAFT_REVIEW.md`](CRAFT_REVIEW.md) for UI and [`SAFETY_REVIEW.md`](SAFETY_REVIEW.md) for data and dependencies.

---

## Principles

1. **Clarity over cleverness.** A junior engineer should follow the change in one sitting.
2. **Types carry meaning.** Units and frames in names or branded types; Zod at every boundary; no `any`.
3. **Smallest correct change.** No drive-by refactors or dependency bumps.
4. **Reuse before invent.** Unit helpers, frame transforms and root finders in `packages/astro`; the polite source client in `apps/worker`; the error shape and schemas in `packages/shared`.
5. **One job per unit.** A route file serves one resource. A job does one analysis. A function does one thing.
6. **Pure where possible.** Calculations take time and inputs as arguments and return values. Side effects live at the edges.
7. **No dead code.** No unused exports, commented-out blocks or debug logging.

---

## Checklist

- [ ] Matches existing patterns in the app or package it touches
- [ ] No bare `number` for a physical quantity in a public signature
- [ ] No vector without its frame in the name
- [ ] Every external input validated with Zod; every API response matches its schema
- [ ] SQL through Kysely; no string-concatenated queries
- [ ] Upserts for idempotent writes; transactions where several rows must agree
- [ ] Workers use transferable typed arrays; nothing allocates per object per frame in hot loops
- [ ] Event listeners, intervals and subscriptions cleaned up (React effects, workers, WebSockets)
- [ ] Errors are handled where they can be acted on; nothing swallowed silently
- [ ] Constants named, with a unit and a cited source
- [ ] `pnpm check` passes

---

## Smell test (reject or simplify)

| Smell | Prefer |
| --- | --- |
| New abstraction for one call site | Inline until the third use |
| Magic number (`86400`, `6378.137`, `1440`) | A named constant with unit and source |
| A class holding no state | A function |
| `try { } catch { }` that hides an error | Let it fail, or handle it and log with context |
| A React component that also fetches, transforms and renders three.js | Split: query hook, pure transform, render |
| Comment that restates the code | Delete it; keep comments that explain why or cite a reference |
| Deep nesting | Early returns |
| A test without a reference | State what the expected value comes from |

---

## Review output

1. **Reuse**: duplicated anything that already exists?
2. **Structure**: right app or package; data, logic and rendering separated?
3. **Types and boundaries**: units, frames, validation.
4. **Simplicity**: anything that should be thinner?
5. **Tests**: what was added; which edge cases remain?
6. **Risks**: assumptions or unfinished work, stated plainly.

Do not claim the work is complete if typecheck, lint or tests fail.
