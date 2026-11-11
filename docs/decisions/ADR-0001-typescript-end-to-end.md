# ADR-0001: TypeScript end to end

**Status:** Accepted, 11 November 2026

## Context

Satellite positions are computed in two places: in browser Web Workers for the interactive globe, and on the backend for passes, eclipses, derived elements and conjunction screening. The browser can run only JavaScript or WebAssembly. The project is built by one person on an 8 GB laptop over about 14 weeks, and its first success criterion is that every number traces to one model (SC-04).

## Decision

Use TypeScript for the web client, the API, the jobs and the telemetry simulator. All astrodynamics lives once, in `packages/astro`, and is imported by both browser and Node.

## Alternatives

- **Go or Rust backend.** Faster for CPU-heavy work, but `packages/astro` would exist twice (TypeScript for the browser, Go/Rust for the server). Two implementations drift, and the globe and the API could disagree about the same satellite. It also adds a second toolchain to learn and run.
- **Python backend.** Strong astrodynamics libraries, but the same duplication problem, and slower than Node for an API. Python is kept for validation only (ADR-0009).

## Consequences

- One test suite proves the maths for both runtimes.
- Request and response types are shared between client and server (ADR-0003).
- CPU-heavy screening is slower than in a compiled language. Acceptable: it runs as a background job where minutes are fine (CONJ-05), after an altitude filter and a spatial grid.
