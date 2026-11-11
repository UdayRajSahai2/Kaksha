# Data sources

Every external source Kaksha uses, its terms, when those terms were last checked, and what is and is not republished. Mirrored by the **Data sources** page in the app (spec LIM-02). This is a practical record, not legal advice.

**Rule:** read a source's current terms and fill in "Terms last checked" before its ingestion client is merged.

| Source | Site | Data | Phase | Public demo? | Terms last checked | Republish |
| --- | --- | --- | --- | --- | --- | --- |
| CelesTrak | celestrak.org | GP data (OMM JSON/CSV), SATCAT | 1, 3 | Yes | Not yet | Derived results; raw files only if terms allow |
| Space-Track | space-track.org | Full catalogue, GP history, public CDMs | 1 | **No, local only** | Not yet | Nothing raw. Code, tests and own summary results only |
| NOAA SWPC | swpc.noaa.gov | Kp, F10.7 | 1 | Yes | Not yet | Yes, with citation (US government public data) |
| Vallado et al. SGP4 verification set | celestrak.org/publications/AIAA/2006-6753/ (copied from python-sgp4 2.27 on PyPI) | Test TLEs and expected states | 1 | Tests only | 11 Nov 2026 (MIT, via python-sgp4) | Yes, as test fixtures with the licence, in `packages/astro/src/__fixtures__/sgp4-verification/` |
| JPL Horizons | ssd.jpl.nasa.gov | Spacecraft and body state vectors | 2 | Yes | Not yet | Derived positions, with credit |
| The Space Devs, Launch Library 2 | thespacedevs.com | Launches, sites, vehicles, providers | 3 | Yes | Not yet | No bulk copy; credit in app and README |
| Natural Earth | naturalearthdata.com | Country outlines | 1, 3 | Yes | Not yet | Public domain |
| NASA imagery | (link each texture used) | Earth and planet textures | 1, 2 | Yes | Not yet | Public domain, credited |

## Client behaviour (all sources)

- Per-source rate limit; CelesTrak groups at most once every 2 hours.
- Every raw response cached under `data/raw/` (gitignored).
- Descriptive User-Agent with a contact address taken from an environment variable.
- Backoff on errors; honour `Retry-After` on 429; stop on 403 or 404.
- Space-Track credentials only in environment variables.
