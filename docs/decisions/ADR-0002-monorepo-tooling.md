# ADR-0002: Monorepo tooling

**Status:** Accepted, 11 November 2026

## Context

Five apps (web, api, worker, telemetry-sim, plus notebooks outside the JS workspace) and two packages (astro, shared). The laptop has 4 cores and about 6.9 GB of usable RAM, so tool weight matters. Unit and frame mistakes are the most common bugs in this field, so the type checker should be as strict as practical.

## Decision

- **pnpm 12 workspaces** for packages and linking.
- **Node.js 24 LTS**, running backend `.ts` files directly by type stripping in development (no build step).
- **TypeScript 7.0** (the native compiler) in strict mode with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `erasableSyntaxOnly`.
- **Biome 2** for lint and format.

## Alternatives

- **npm or Yarn workspaces.** Work, but pnpm is stricter about undeclared dependencies and lighter on disk.
- **Turborepo or Nx.** Task caching is not worth another tool at this size.
- **ESLint + Prettier.** Two tools and more memory; Biome covers both.
- **TypeScript 6.** The fallback if a tool does not yet support 7.

## Consequences

- No enums or parameter properties (type stripping forbids non-erasable syntax). Use union types and plain objects.
- Checked in week 1: Node 24.8 strips types for workspace packages reached through `node_modules` links, so `tsx` is not needed.
- pnpm 12 refuses packages published less than a day ago (minimum release age). Keep that check on; pin the previous release instead of excluding a package.
- Biome's rule set is smaller than typescript-eslint's type-aware rules; the strict compiler settings make up most of the gap.
