# ADR-0007: Plain three.js, instanced points, worker propagation

**Status:** Accepted, 11 November 2026

## Context

The globe must draw 20,000+ objects at 60 fps on a GTX 1050 with a 4-core CPU (SC-02). Propagation must not block the UI thread. The renderer needs direct control of the per-frame position buffer.

## Decision

- **three.js 0.187**, used directly, with one points object for all satellites and one `BufferAttribute` for positions.
- **Native Web Workers** (at most 3) propagate slices of the catalogue at 5–10 Hz into `Float32Array`s, transferred, not copied, to the main thread; the renderer interpolates to 60 fps.
- Picking by GPU colour ID or a spatial index. Orbit lines only for selected objects.
- React owns the page around the canvas, not the scene graph.

## Alternatives

- **react-three-fiber.** Pleasant for scene graphs, but adds a React layer over the one buffer update that dominates performance.
- **One mesh per object.** 20,000 draw calls; far too slow.
- **CesiumJS.** Heavy; hides the TEME/ECEF work.
- **Comlink for workers.** Convenient, but `postMessage` with transferables is small enough to own.

## Consequences

- Scene code is imperative and lives in `apps/web/src/globe/`, wired to React through the store.
- A frame-time and propagation benchmark is recorded in week 6, before features build on top.
