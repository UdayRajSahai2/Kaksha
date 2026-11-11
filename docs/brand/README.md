# Kaksha brand

**Kaksha** (कक्षा, "orbit"). Tagline: *Every orbit, in view.*

## The mark

An orbit with the planet at a focus, not the centre, as in Kepler's first law. The amber dot is the satellite. The ellipse is tilted −24°.

| File | Use |
| --- | --- |
| [`mark-on-dark.svg`](mark-on-dark.svg) | On dark grounds |
| [`mark-on-light.svg`](mark-on-light.svg) | On light grounds |
| [`app-icon.svg`](app-icon.svg) | App icon, 104 px tile |
| [`../../apps/web/public/favicon.svg`](../../apps/web/public/favicon.svg) | Favicon, 32 px tile |

Stroke and dot sizes grow as the mark shrinks so it stays legible: ring 5, 6, 8 and 11 units at 104, 76, 40 and 24 px.

Keep clear space around the mark equal to the planet's diameter.

## Colour

| Role | On dark | On light |
| --- | --- | --- |
| Deep space (ground) | `#0B1020` | |
| Orbit (ring) | `#3DD6D0` | `#0F8F8A` |
| Satellite (dot) | `#FFB547` | `#F29E1F` |
| Planet | Starlight `#F4F6FA` | Deep space `#0B1020` |
| Slate (secondary text) | `#4A5470` | |

In the app these are the `--color-mark-*` tokens in `apps/web/src/styles/tokens.css`; the interface itself keeps the Console theme's palette.

## Type

- Wordmark: Space Grotesk 600, lowercase `kaksha`, tracking −0.03em.
- Data: the app uses Atkinson Hyperlegible Mono for measured values (the brand sheet suggests JetBrains Mono; the Console theme's mono was kept for its slashed zero and legibility).
- Devanagari: Noto Sans Devanagari for कक्षा.
