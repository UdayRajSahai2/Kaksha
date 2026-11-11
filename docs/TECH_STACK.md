# TECH_STACK.md: the chosen stack

**Status: approved** (11 November 2026). Decision records: [`decisions/`](decisions/README.md).

Versions are the current releases on the npm registry as of 11 November 2026, checked with `npm view`. Pin exact versions at install. Do not upgrade a major as a side effect.

The constraints that shaped every choice:

1. **Correctness first.** Types that catch unit and frame mistakes; validation at boundaries; tests against references.
2. **The dev laptop.** Ryzen 5 2500U (4 cores), GTX 1050, 8 GB RAM (6.9 GB usable), 512 GB SSD, Windows 10. Every always-running service costs memory, so fewer services win.
3. **One language.** TypeScript end to end, shared types between client and server; Python only for validation.
4. **Readable by a reviewer.** Prefer tools that read like SQL and plain TypeScript over tools with their own magic.

---

## Already on the machine

| Tool | Version | Status |
| --- | --- | --- |
| Node.js | 24.8.0 | Keep (24 is an LTS line) |
| npm | 11.6.0 | Used only to install pnpm |
| Python | 3.13.5 | Keep |
| uv | 0.13.0 | Use for the notebooks' environment |
| Git | 2.47.1 | Keep |
| Docker | 28.4.0 | Installed, but not used until week 13 (RAM) |
| Java | 25 LTS | Not needed (Orekit is out of scope) |
| SSD | 512 GB | The design doc's top upgrade is already done |

Installed for this project (11 November 2026): **pnpm 12.18.0**, **PostgreSQL 18.6** (native Windows service `postgresql-x64-18`, `shared_buffers` 256 MB, databases `kaksha` and `kaksha_test`).

---

## The stack

### Workspace and tooling

| Piece | Choice | Version | Why |
| --- | --- | --- | --- |
| Runtime | Node.js LTS | 24.x | Installed; runs `.ts` files directly by stripping types, so the backend needs no build step in development |
| Package manager | pnpm workspaces | 12.18.0 | Strict, fast, disk-efficient; workspaces cover the monorepo without Turborepo or Nx |
| Language | TypeScript, strict | 7.0.2 | The native (Go) compiler: typechecks far faster and lighter, which matters on 4 cores. `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly` |
| Lint and format | Biome | 2.6.6 | One fast tool instead of ESLint + Prettier; less to configure, less RAM |

### Astrodynamics (`packages/astro`)

| Piece | Choice | Version | Why |
| --- | --- | --- | --- |
| SGP4/SDP4 | satellite.js | 7.1.0 | Mature, runs in browser and Node, supports OMM. Wrapped with typed units; validated, not trusted |
| Planets, Sun, Moon (phase 2) | astronomy-engine | 2.1.19 | Runs in the browser, no network, small; also the Sun position for eclipses if its accuracy suits |
| Everything else | Our own code | | Frames, passes, eclipse, Doppler, RTN, root finding, detectors: this is the part reviewers read |

### Web client (`apps/web`)

| Piece | Choice | Version | Why |
| --- | --- | --- | --- |
| UI | React | 19.3.1 | Many views, linked state, wide familiarity |
| Build | Vite + @vitejs/plugin-react | 8.3.7 / 6.3.0 | Fast, light dev server; native Web Worker support. 8.3.8 was a day old at install and failed pnpm's minimum-release-age check, so 8.3.7 is pinned |
| 3D | three.js (plain) | 0.187.0 | Direct control of one `BufferAttribute` updated from worker buffers; no React wrapper in the hot path |
| Concurrency | Web Workers (native), transferable typed arrays | | No library needed; at most 3 workers on this CPU |
| State | Zustand | 5.1.0 | One small store for time, selection, filters, station; selectors keep re-renders cheap |
| Server data | TanStack Query | 5.107.1 | Caching, retries and stale handling for API data |
| API client | openapi-fetch (types from openapi-typescript) | 0.17.0 / 7.13.0 | Typed client generated from the API's OpenAPI; tiny runtime |
| Routing | React Router (library mode) | 8.5.1 | Deep links such as `/sat/25544` and `/passes?station=…` |
| Time-series charts | uPlot | 1.6.32 | Very fast for long series (element history, telemetry); about 50 KB |
| Custom plots and map | d3 modules: d3-scale, d3-shape, d3-geo | 4.0.3 / – / 3.1.2 | Sky plot, RTN plot, histograms and the canvas world map; import only the modules used |
| Styling | CSS Modules + `tokens.css` | | No Tailwind, no component library; tokens shared with three.js |
| Map data and textures | Natural Earth via world-atlas (land 1:110m), decoded with topojson-client; NASA public-domain imagery later | 2.0.2 / 3.1.0 | No tile server, no licence risk (Natural Earth is public domain; both packages ISC) |
| Fonts | Host Grotesk and Atkinson Hyperlegible Mono, self-hosted through Fontsource | 5.3.0 | The Console design theme's faces (OFL); self-hosted, so no visitor request goes to a font CDN |

### API (`apps/api`)

| Piece | Choice | Version | Why |
| --- | --- | --- | --- |
| Server | Fastify | 5.12.8 | Fast, light, plugin model without NestJS's decorators and DI weight |
| Validation and types | Zod | 4.6.7 | One schema gives runtime validation and the TypeScript type; lives in `packages/shared` |
| Schema bridge | fastify-type-provider-zod | 7.0.0 | Routes typed from Zod; feeds OpenAPI generation |
| OpenAPI | @fastify/swagger | 9.9.3 | OpenAPI document generated from the route schemas |
| Telemetry stream | @fastify/websocket | 11.3.7 | `WS /telemetry/{spacecraft}` |
| Launch updates (phase 3) | Server-Sent Events, hand-written | | One-way; simpler than WebSockets |
| Rate limiting, compression | @fastify/rate-limit, @fastify/compress | pin at install | Spec API-05; bulk elements are compressed |
| Logging | pino (built into Fastify) | 10.4.0 | Structured JSON logs with redaction |
| Metrics | prom-client | 15.1.3 | `/metrics` for ingestion lag, job duration, API latency |

### Jobs and ingestion (`apps/worker`)

| Piece | Choice | Version | Why |
| --- | --- | --- | --- |
| Queue and scheduler | pg-boss | 12.38.2 | Runs on Postgres: no Redis, one less service on 8 GB |
| HTTP | Node's built-in `fetch` + our polite client | | Rate limit, disk cache, User-Agent, backoff, stop on 403/404. Small enough to own |
| Raw cache | Files in `data/raw/` | | Replay analysis without hitting the source |

### Data

| Piece | Choice | Version | Why |
| --- | --- | --- | --- |
| Database | PostgreSQL, native Windows install | 18.x | Relational data and, later, time series in one database; native saves the RAM Docker would use. `shared_buffers` about 256 MB |
| Time series | TimescaleDB extension | added in week 13 | Hypertable, continuous aggregates and retention for telemetry. Not installed before it is needed |
| Query builder | Kysely + pg | 0.29.8 / 8.23.1 | Type-safe SQL that still reads like SQL; no ORM engine |
| Migrations | Kysely Migrator, files in `infra/migrations/` | | Same tool; migrations are raw SQL inside numbered files |

### Testing and validation

| Piece | Choice | Version | Why |
| --- | --- | --- | --- |
| Unit, integration, contract | Vitest | 5.1.0 | Shares Vite's config; TypeScript native; `fastify.inject` for API contracts |
| Property tests | fast-check | 4.10.2 | Round trips and invariants (ECEF ↔ geodetic, monotonic time) |
| Benchmarks | Vitest bench | | Propagation time; CI fails on regressions |
| End to end | Playwright | 1.65.0 | Main flows; runs in CI, not on the laptop |
| Validation notebooks | Python 3.13, uv, Skyfield, sgp4, numpy, pandas, matplotlib, JupyterLab | latest at install | Independent cross-check; space teams use Python |

### Operations

| Piece | Choice | Why |
| --- | --- | --- |
| CI | GitHub Actions with a Postgres service container | Runs tests off the laptop |
| Containers | Docker Compose (api, worker, db, web) from week 13 | Not before; Docker Desktop costs RAM |
| Secrets | `.env` (gitignored) + `.env.example` | Space-Track credentials never in git |
| Demo hosting | Decided in week 14 | Likely one small VPS running Compose; check prices then |

---

## Rejected, and why

| Option | Rejected because |
| --- | --- |
| NestJS | Heavier (decorators, DI) for one API; Fastify is enough |
| Next.js | Server rendering adds little to a WebGL console; separate API is clearer |
| react-three-fiber | A React layer over the per-frame buffer update we must control directly |
| CesiumJS | Large; hides the frame work this project exists to show. CZML export keeps Cesium users served |
| Redis + BullMQ | Another always-running service; pg-boss does the job on Postgres |
| Prisma / TypeORM | Hide SQL; Prisma ships a query engine. Kysely stays close to SQL |
| Drizzle | Reasonable, but Kysely's query builder maps more directly to the SQL in the design doc |
| Redux Toolkit | More ceremony than one store needs |
| Recharts / ECharts | Slower or heavier on long series; uPlot + d3 cover the plots |
| Tailwind / a component library | Tokens + CSS Modules are enough; add Radix primitives only if accessibility needs them, with approval |
| ESLint + Prettier | Two tools and more RAM; Biome covers both |
| Turborepo / Nx | pnpm workspaces suffice for five apps and two packages |
| Docker from day one | RAM on an 8 GB laptop |
| Orekit | Java bridge for a cross-check Skyfield already provides |

---

## Risks to check in week 1

| Risk | Check | Fallback |
| --- | --- | --- |
| TypeScript 7 is a new major (native compiler); some tools may lag | `pnpm typecheck` across all packages; Vite and Vitest strip types themselves, so only `tsc` is affected | Pin TypeScript 6 for typechecking |
| Node refuses to strip types for files under `node_modules` | **Resolved in week 1:** Node 24.8 ran `packages/astro` from `.ts` through a `node_modules` link (the link resolves to its real path outside `node_modules`) | Not needed |
| satellite.js 7 API differs from older tutorials | Read its README and changelog before writing the wrapper | None needed; adapt the wrapper |
| TimescaleDB on native Windows Postgres | Check TimescaleDB's supported Postgres versions and Windows builds before week 13 | Move the database into the `timescale/timescaledb` image (dump and restore is small) |

---

## Changing the stack

Write a new decision record in [`decisions/`](decisions/README.md) that supersedes the old one, update this file, and get approval before installing anything.
