# ADR-0008: Web client libraries

**Status:** Accepted, 11 November 2026

## Context

The client has many linked views (globe, map, pass planner, analytics, conjunctions, telemetry) that share time, selection and filters (WEB-01), long time series (element history, telemetry), custom plots (sky plot, RTN, histograms) and a canvas world map.

## Decision

| Need | Choice |
| --- | --- |
| UI | React 19 on Vite 8 |
| Shared client state | Zustand 5 (one store) |
| Server data | TanStack Query 5 with the generated openapi-fetch client |
| Routing and deep links | React Router 8, library mode |
| Time-series charts | uPlot 1.6 |
| Custom plots and map | d3-scale, d3-shape, d3-geo, drawn on SVG or canvas |
| Styling | CSS Modules + `tokens.css`, shared with three.js |

## Alternatives

- **Redux Toolkit.** More ceremony than one store needs.
- **Recharts or ECharts.** Slower or heavier on long series.
- **Leaflet or Mapbox with tiles.** Tile usage limits and licence terms; Natural Earth on canvas avoids both.
- **Tailwind or a component library.** Not needed; Radix primitives may be added for accessibility, with approval.
- **Next.js.** Server rendering adds little to a WebGL console.

## Consequences

- Few dependencies, each with one job.
- Charts are partly hand-built with d3, so they need their own accessibility work (text alternatives for key values).
