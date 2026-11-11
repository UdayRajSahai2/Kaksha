"""Independent reference states from Skyfield for Kaksha's cross-check (spec CORE-07).

Run:  uv run python skyfield_crosscheck.py
Writes: packages/astro/src/__fixtures__/skyfield/skyfield-reference.json

The TypeScript test packages/astro/src/skyfield.crosscheck.test.ts compares Kaksha's
output to this file and publishes the errors; CI needs only the JSON, not Python.

For each SGP4 verification case (Vallado et al. 2006), at its first, middle and last
reference step, it records:
  - the TEME state from python-sgp4 (an independent SGP4 implementation) at exact
    minutes since epoch, and Skyfield's TEME at the same UTC instant,
  - the Earth-fixed state of that TEME vector from Skyfield's TEME_to_ITRF (GMST 1982,
    the same model as Kaksha) with UTC passed in place of UT1 and no polar motion,
  - the Earth-fixed position from Skyfield's full chain (TEME -> GCRS -> ITRS, IAU 2000/2006,
    real UT1, no polar motion loaded) and WGS-84 geodetic coordinates from it,
  - UT1 - UTC at that instant, which explains most of the difference Kaksha shows
    against the full chain (Kaksha uses UTC for Earth rotation).
"""

import datetime
import json
from pathlib import Path

import numpy as np
from sgp4.api import Satrec
from skyfield.api import load, wgs84
from skyfield.framelib import itrs
from skyfield.sgp4lib import EarthSatellite, TEME_to_ITRF

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "packages" / "astro" / "src" / "__fixtures__"
CASES = FIXTURES / "sgp4-verification" / "SGP4-VER.TLE"
REFERENCE = FIXTURES / "sgp4-verification" / "tcppver.out"
OUT = FIXTURES / "skyfield" / "skyfield-reference.json"
PASSES_OUT = FIXTURES / "skyfield" / "skyfield-passes.json"
# Stations for the pass check (WGS-84 geodetic, km). Mask 10 deg, geometric elevation.
STATIONS = {
    "Bengaluru": (12.9716, 77.5946, 0.92),
    "Kiruna area": (67.857, 20.964, 0.4),
    "Santiago": (-33.45, -70.67, 0.57),
}
PASS_CASES = [6251, 28057, 29238, 88888]
MASK_DEG = 10.0
DAY_MS = 86_400_000


def read_cases():
    lines = [l.rstrip("\n") for l in CASES.read_text().splitlines() if l.strip() and not l.startswith("#")]
    return [(lines[i], lines[i + 1][:69]) for i in range(0, len(lines), 2)]


def read_reference_minutes():
    blocks = []
    for line in REFERENCE.read_text().splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[1] == "xx":
            blocks.append((int(parts[0]), []))
        elif len(parts) >= 7 and blocks:
            blocks[-1][1].append(float(parts[0]))
    return blocks


def utc_from_unix_ms(ts, t_ms):
    """The UTC instant Kaksha means by t_ms: Unix milliseconds, which do not count leap seconds.

    Not ts.utc(1970, 1, 1, 0, 0, t_ms / 1000): Skyfield treats overflowing seconds as elapsed
    SI seconds, leap seconds included, which lands 21.7 s early in 2000. Not datetime either: it
    rounds to microseconds, 7.5 mm of LEO motion. Calendar date plus float seconds of day keeps both.
    """
    days, ms_of_day = divmod(t_ms, DAY_MS)
    date = datetime.date(1970, 1, 1) + datetime.timedelta(days=int(days))
    return ts.utc(date.year, date.month, date.day, 0, 0, ms_of_day / 1000)


def main():
    ts = load.timescale(builtin=True)
    points = []
    for (line1, line2), (satnum, minutes) in zip(read_cases(), read_reference_minutes(), strict=True):
        if int(line1[2:7]) != satnum:
            raise ValueError(f"case {line1[2:7]} paired with reference {satnum}")
        model = Satrec.twoline2rv(line1, line2)
        if satnum == 33334 or not minutes:
            continue  # rejected at load (see the verification test); nothing to compare
        sat = EarthSatellite(line1, line2, ts=ts)
        epoch_ms = ((model.jdsatepoch - 2440587.5) + model.jdsatepochF) * DAY_MS
        picks = sorted({minutes[0], minutes[len(minutes) // 2], minutes[-1]})
        for m in picks:
            t_ms = epoch_ms + m * 60_000
            t = utc_from_unix_ms(ts, t_ms)
            # The algorithm, at exact minutes since epoch (no time conversion on either side).
            error, r_teme, v_teme = model.sgp4_tsince(m)
            if error:
                raise RuntimeError(f"{satnum} at {m} min: SGP4 error {error}")
            r_teme, v_teme = np.array(r_teme), np.array(v_teme)
            # The same instant reached from UTC on Skyfield's side, for the end-to-end row.
            r_teme_at_t, _, _ = sat._position_and_velocity_TEME_km(t)
            # Kaksha's frame model on this TEME vector: GMST 1982, UTC as UT1, no polar motion.
            # Julian date split into whole and fraction: a single float JD resolves only ~40 us.
            days, ms_of_day = divmod(t_ms, DAY_MS)
            r_pef, v_pef = TEME_to_ITRF(2440587.5 + days, r_teme, v_teme * 86400.0, 0.0, 0.0, ms_of_day / DAY_MS)
            geocentric = sat.at(t)
            r_itrs = geocentric.frame_xyz(itrs).km
            geo = wgs84.geographic_position_of(geocentric)
            points.append(
                {
                    "satnum": satnum,
                    "line1": line1,
                    "line2": line2,
                    "minutesSinceEpoch": m,
                    "tUtcMs": t_ms,
                    "temeKm": list(r_teme),
                    "temeKmS": list(v_teme),
                    "temeAtInstantKm": list(r_teme_at_t),
                    "pefUtcKm": list(r_pef),
                    "pefUtcKmS": list(v_pef / 86400.0),
                    "itrsKm": list(r_itrs),
                    "latDeg": geo.latitude.degrees,
                    "lonDeg": geo.longitude.degrees,
                    "heightKm": geo.elevation.km,
                    "ut1MinusUtcS": float(t.dut1),
                }
            )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    meta = {
        "generator": "notebooks/skyfield_crosscheck.py",
        "skyfield": __import__("skyfield").__version__,
        "sgp4": __import__("sgp4").__version__,
        "timescale": "builtin (Skyfield's bundled leap seconds and UT1 - UTC)",
        "polarMotion": "not loaded (zero)",
    }
    OUT.write_text(json.dumps({"meta": meta, "points": points}, indent=1) + "\n")
    print(f"wrote {len(points)} points to {OUT.relative_to(ROOT)}")


def passes(ts):
    """Rise, culmination and set from Skyfield's find_events over one day from each epoch."""
    cases = {int(l1[2:7]): (l1, l2) for l1, l2 in read_cases()}
    out = []
    for satnum in PASS_CASES:
        line1, line2 = cases[satnum]
        sat = EarthSatellite(line1, line2, ts=ts)
        model = Satrec.twoline2rv(line1, line2)
        epoch_ms = ((model.jdsatepoch - 2440587.5) + model.jdsatepochF) * DAY_MS
        t0, t1 = utc_from_unix_ms(ts, epoch_ms), utc_from_unix_ms(ts, epoch_ms + DAY_MS)
        for name, (lat, lon, h) in STATIONS.items():
            site = wgs84.latlon(lat, lon, elevation_m=h * 1000)
            times, kinds = sat.find_events(site, t0, t1, altitude_degrees=MASK_DEG)
            events = []
            for t, kind in zip(times, kinds):
                alt, az, _ = (sat - site).at(t).altaz()
                events.append({
                    "kind": ["rise", "culmination", "set"][int(kind)],
                    "tUtcMs": t.utc_datetime().timestamp() * 1000,
                    "elevationDeg": alt.degrees,
                    "azimuthDeg": az.degrees,
                })
            out.append({"satnum": satnum, "line1": line1, "line2": line2, "station": name,
                        "latDeg": lat, "lonDeg": lon, "heightKm": h,
                        "fromUtcMs": epoch_ms, "toUtcMs": epoch_ms + DAY_MS, "events": events})
    PASSES_OUT.write_text(json.dumps({"maskDeg": MASK_DEG, "windows": out}, indent=1) + "\n")
    print(f"wrote {sum(len(w['events']) for w in out)} pass events to {PASSES_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
    passes(load.timescale(builtin=True))
