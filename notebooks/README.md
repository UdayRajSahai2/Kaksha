# Validation notebooks

Independent cross-checks of `packages/astro` in Python (spec CORE-07, ADR-0009). Python is a validation tool only; no production path depends on it, and CI reads the committed outputs.

```bash
uv sync
uv run python skyfield_crosscheck.py   # writes packages/astro/src/__fixtures__/skyfield/skyfield-reference.json
```

Results: [`docs/validation/skyfield-crosscheck.md`](../docs/validation/skyfield-crosscheck.md).

One trap the script documents: `ts.utc(1970, 1, 1, 0, 0, seconds)` counts leap seconds in the overflowing seconds (21.7 s early in 2000), while Kaksha's UTC milliseconds, like Unix time, do not. The script builds times from a calendar date plus seconds of day.
