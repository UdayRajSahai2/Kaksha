# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Copilot, Codex, etc.) working in this repository.

**Read this file fully before writing or changing code.** Then open the matching guides under [`docs/`](docs/README.md). If a rule here conflicts with a request, tell the user before proceeding.

---

## Project overview

**Kaksha** (कक्षा, "orbit") is an orbital operations console: a web application that ingests public orbit data, predicts where satellites are, analyses how their orbits change, screens for close approaches, plans ground station passes and runs a simulated telemetry dashboard with alarms. A 3D globe and a 2D map are the visual layer; **the analysis is the substance**.

The audience is hiring engineers at space companies. They judge **correctness first, engineering practice second, looks third**. Every decision in this repo follows that order.

It is **not** an operational collision-avoidance tool. TLE/OMM-based results are screening-grade, and the app says so on screen and in the README.

The project ships in three phases, in this order:

1. **Earth operations**: propagation, frames, passes, eclipses, Doppler, element history, manoeuvres, decay, conjunctions, telemetry.
2. **Beyond Earth**: Sun, Moon, planets and deep-space spacecraft on a shared time slider.
3. **Space industry map**: catalogue counts, operational status, launch sites and launches.

Product rules and requirement IDs live in [`kaksha-spec.md`](kaksha-spec.md). The original design document is the source for that spec.

---

## Required reading before coding

Role guides live under [`docs/`](docs/README.md). Each one opens with **You are a …**. Adopt that persona for the task ([`docs/ROLES.md`](docs/ROLES.md)).

| When | Read |
| --- | --- |
| Every change | This file |
| New app, package, table, endpoint or job; "where does this live?" | [`docs/SOFTWARE_ARCHITECT.md`](docs/SOFTWARE_ARCHITECT.md), system architect |
| Anything in `packages/astro`, any number shown to a visitor | [`docs/ASTRO_REVIEW.md`](docs/ASTRO_REVIEW.md), astrodynamics engineer |
| Any feature or bugfix | [`docs/QC.md`](docs/QC.md), senior QA |
| After writing or reviewing code | [`docs/CODE_QUALITY.md`](docs/CODE_QUALITY.md), senior engineer (quality) |
| UI, charts, copy, colour, motion, the globe's look | [`docs/CRAFT_REVIEW.md`](docs/CRAFT_REVIEW.md), product / craft engineer |
| Data sources, secrets, endpoints, dependencies, deploy | [`docs/SAFETY_REVIEW.md`](docs/SAFETY_REVIEW.md), security and compliance engineer |
| Choosing or changing a library | [`docs/TECH_STACK.md`](docs/TECH_STACK.md) |
| Requirement IDs, phases, performance budget | [`kaksha-spec.md`](kaksha-spec.md) |

Do not invent product behaviour that is not in the spec. If a request has no requirement ID, say so and propose the spec change first.

---

## Tech stack

The full list, with versions and the reason for each choice, is in [`docs/TECH_STACK.md`](docs/TECH_STACK.md). In short:

- **TypeScript (strict) end to end** on Node.js 24 LTS, pnpm workspaces, Biome for lint and format
- **Web**: React 19, Vite 8, three.js (plain, no React wrapper), Web Workers, satellite.js, Zustand, TanStack Query, uPlot and d3 modules
- **API**: Fastify 5, Zod 4, OpenAPI generated from the Zod schemas, typed client generated from OpenAPI
- **Data**: PostgreSQL 18, Kysely, pg-boss for jobs; TimescaleDB added in the telemetry phase
- **Tests**: Vitest, fast-check, Playwright (CI); Python + Skyfield notebooks for validation

Do not swap stack pieces (another framework, an ORM, Redis, a component library, Tailwind, react-three-fiber, Cesium) without updating `docs/TECH_STACK.md` first and getting approval.

---

## Development philosophy

1. Understand the request and the surrounding code first.
2. **Correct before fast, fast before pretty.** A wrong number on screen is the worst bug this project can have.
3. **Do not overengineer.** No microservices, no event bus, no plugin systems, no abstractions for one call site.
4. Build the smallest correct change. Do not refactor unrelated code.
5. Reuse what exists (the unit types, frame transforms and root finders in `packages/astro`, the polite HTTP client, the API error shape) before creating something new.
6. Never guess library behaviour or astrodynamics constants. Check the version in `package.json`, read its docs, and cite the source of every constant.
7. No dead code: no commented-out blocks, unused exports or leftover `console.log`.
8. Finish only when `pnpm check` passes and the QC pass in [`docs/QC.md`](docs/QC.md) is done.

---

## Decision making

- If something is unclear, ask. A short question beats a wrong guess.
- If a new dependency would help a lot, recommend it, explain why and **wait for approval** before installing.
- Pin exact versions. Do not upgrade majors as a side effect.
- Never commit until the user asks. Never force-push. Never skip hooks unless asked.
- Name local plan docs with a `-plan.md` suffix so they stay out of git.
- Park new ideas in `BACKLOG.md` instead of building them (scope creep is a named project risk).

---

## Folder structure

```txt
apps/
  web/                    # React + three.js client
    src/
      components/         # panels of the astro workbench (WEB-13); one .tsx and, if needed, one .module.css each
      lib/                # pure helpers (input parsing, formatting), unit-tested in lib/*.test.ts
      app/                # routes, layout, providers (when a second view lands)
      state/              # the one Zustand store (time, selection, filters, station)
      globe/              # three.js scene, instanced points, picking, orbit lines
      map/                # d3-geo canvas map, ground tracks, density bins
      workers/            # propagation worker pool (imports packages/astro)
      views/              # pass planner, analytics, conjunctions, telemetry, known limits, data sources
      charts/             # uPlot and d3 chart components
      styles/             # tokens.css and base.css
  api/                    # Fastify REST + WebSocket + SSE
    src/
      routes/             # one file per resource
      db/                 # Kysely instance and queries
  worker/                 # pg-boss jobs: ingestion and analysis
    src/
      sources/            # one client per source (celestrak, spacetrack, swpc, horizons, ll2)
      jobs/               # ingest, derive, detect-manoeuvres, decay, screen-conjunctions
  telemetry-sim/          # synthetic spacecraft and CCSDS packet encoder
packages/
  astro/                  # ALL astrodynamics: units, time, propagation, frames, passes, eclipse, doppler, conjunction
                          # no UI, no database, no network imports; pure and tested
  shared/                 # Zod schemas, API types, generated OpenAPI client, telemetry dictionary types
notebooks/                # Python validation against Skyfield and published vectors (uv project)
infra/
  migrations/             # Kysely migrations (SQL inside), numbered
  docker-compose.yml      # from the telemetry phase onwards
docs/                     # agent role guides, tech stack, known limits, data sources, decisions/
data/                     # raw response cache (gitignored)
kaksha-spec.md            # requirements, phases, performance budget
```

Dependency direction:

- `packages/astro` imports nothing from this repo and nothing that touches the DOM, the network or a database.
- `packages/shared` may import `packages/astro` types only.
- `apps/*` import `packages/*`. Apps never import each other.
- `apps/web` reaches the backend only through the generated client in `packages/shared`.
- Only `apps/worker` talks to external data sources. `apps/api` serves what is stored.

---

## Domain rules (non-negotiable)

- **Units in names or types.** `altKm`, `rateKmS`, `angleRad`, or the branded types from `packages/astro/units`. A bare `number` for a physical quantity in a public function signature is a defect.
- **Frames in names.** `posTemeKm`, `posEcefKm`, `enu`. Never pass a vector without saying which frame it is in.
- **Time is UTC** at every boundary (database, API, UI). Internally convert to Julian date. Say where UT1-UTC and leap seconds are ignored.
- **Every number on screen traces to a source, an epoch and a model.** API responses that depend on an element set carry its epoch and source.
- **Never invent precision.** No probability of collision without a real covariance. Decay is a range, never a single date. Staleness is shown.
- **Derived rows carry a version** (`model_version`, `detector_version`) so they can be regenerated.
- **Respect data terms.** Space-Track and CDM data never reach the public repo, public API or public demo. Ingestion clients are polite (rate limit, cache, backoff, stop on 403/404).

---

## TypeScript

Strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. `const` by default, early returns, small functions, no `any` (use `unknown` and narrow). Validate every external input (HTTP, files, query strings) with Zod at the boundary; trust types inside. Hot loops in workers use typed arrays, not arrays of objects.

---

## Commands

```bash
pnpm install
pnpm typecheck      # tsc in every package
pnpm lint           # biome check (code and JSON; Markdown is not formatted)
pnpm format         # biome check --write
pnpm test           # vitest across the workspace
pnpm test:watch
pnpm check          # typecheck + lint + test (CI also runs pnpm build)
pnpm dev            # the web app at http://localhost:5173 (the astro workbench for now)
pnpm build
```

Added when its app lands: `pnpm db:migrate` (week 4).

Tests sit next to the code as `*.test.ts`. Pin new packages with `pnpm add --save-exact`; if pnpm refuses a package for being too new, pin the previous release rather than excluding it.

On Windows PowerShell, do not chain with `&&`. Run commands separately.

---

## Definition of done

A change is done only when:

1. Behaviour matches the request and the relevant spec IDs.
2. `pnpm check` passes (and `pnpm build` for anything shipped).
3. Any change to a calculation passed the [`docs/ASTRO_REVIEW.md`](docs/ASTRO_REVIEW.md) checklist, with a test against a stated reference and tolerance.
4. The QC checklist that applies was walked ([`docs/QC.md`](docs/QC.md)).
5. Code quality and craft checks are clean ([`docs/CODE_QUALITY.md`](docs/CODE_QUALITY.md), [`docs/CRAFT_REVIEW.md`](docs/CRAFT_REVIEW.md)).
6. Data sources, secrets and dependencies were checked ([`docs/SAFETY_REVIEW.md`](docs/SAFETY_REVIEW.md)).
7. `docs/known-limits.md` was updated if the change adds an approximation.
8. No secrets, raw Space-Track data or plan docs were staged.

---

## Communication

Be concise. Say what changed, how to verify it, and what error or tolerance applies. Do not pad with process narration.

---

## Final reminder

Before every implementation:

1. Read this file.
2. Read the docs that apply.
3. Get the number right, then make it fast, then make it pretty.
4. Prefer reuse and the smallest correct change.
5. Say what you ignored, so the Known limits page stays honest.
