# Known limits

What Kaksha's models ignore, how large the resulting errors are, and how element age affects them. This file is mirrored by the **Known limits** page in the app (spec LIM-01). Update it whenever a change adds an approximation.

**Kaksha is not for operational use.** Results are screening-grade.

---

## Orbit propagation

- Positions come from SGP4/SDP4 applied to public GP element sets (OMM/TLE). Element sets are fitted to SGP4 theory and are only meaningful when propagated with SGP4.
- Typical accuracy is roughly a kilometre at epoch for low Earth orbit, degrading by a few kilometres per day depending on the object, drag and manoeuvres.
- A manoeuvre after the element set's epoch is not reflected until a new element set is published.
- SGP4 runs as published (satellite.js 7.1.0, WGS-72 constants, improved mode). Its optional "community decay check" is off, so an object that decayed long ago can still return positions until SGP4 itself reports an error.
- SGP4's velocity is not exactly the time derivative of its position: they differ by about 2e-5 km/s (2 cm/s) in LEO. This is a property of the theory, not of Kaksha's code.
- OMM epochs are truncated to whole milliseconds when loaded (a satellite.js limitation): under 1 ms of epoch error, under 8 m along-track in LEO. TLE epochs carry 1e-8 day (under 1 ms) to begin with.

## Frames and time

- SGP4 output is in TEME. TEME → Earth-fixed rotates by GMST (IAU-1982 model) only.
- Polar motion is ignored, so the Earth-fixed frame is the pseudo-Earth-fixed frame (PEF), not ITRF. They differ by a few tenths of an arcsecond, up to about 15 m at the surface.
- Ignored: UT1-UTC (UTC is used for Earth rotation), length-of-day variation, and solar and lunar perturbations beyond what SGP4/SDP4 includes.
- Geodetic coordinates use the WGS-84 ellipsoid; SGP4 internally uses WGS-72 gravity constants, as the theory requires.
- Leap seconds: instants are stored as UTC milliseconds since 1970, like Unix time, so every day is treated as 86 400 s and a leap second is not represented. Intervals that span a leap second are off by that second. No leap second has been inserted since 31 December 2016.
- UT1 is approximated by UTC for Earth rotation. The IERS keeps |UT1 - UTC| below 0.9 s: about 0.4 km at the equator on the ground, and proportionally more for distant objects (9.2 km measured for an object 107 000 km out, against Skyfield).
- Time resolution: Julian dates are float64, which resolves about 40 microseconds near the present. GMST is computed from milliseconds instead, so Earth rotation does not carry that rounding.

## Measured errors

| Comparison | Cases | Points | Max position error | RMS position error | Details |
| --- | --- | --- | --- | --- | --- |
| SGP4 verification vectors (Vallado et al., AIAA 2006-6753) | 33 | 666 | 0.12 mm | 0.011 mm | [`validation/sgp4-verification.md`](validation/sgp4-verification.md) |
| Skyfield 1.55 and python-sgp4 2.27: TEME and Earth-fixed transform, same models | 32 | 95 | 0.0015 mm | 0.00024 mm | [`validation/skyfield-crosscheck.md`](validation/skyfield-crosscheck.md) |
| Skyfield full IAU 2000/2006 chain with real UT1 | 32 | 95 | 9.2 km | 1.6 km | Almost all Earth rotation over UT1 - UTC; 4.3 mm remains after removing it |

The verification vectors measure the implementation against the reference code, not SGP4 against reality. With real element sets the model error (about a kilometre at epoch, growing with age) is about ten million times larger.

Frame transforms are checked against independent values: GMST against Vallado's example 3-5 (to 1e-7 deg) and satellite.js (to 5e-9 rad); geodetic conversion against satellite.js (to 1e-9 deg and 1 mm) and by round trip from the surface to beyond GEO (to 10 micrometres).

## Passes, eclipses and Doppler

- Elevation is geometric: atmospheric refraction (about 0.5 deg at the horizon) is not applied, so real rise is slightly earlier and set slightly later.
- Passes: 30 s coarse step, events refined to 1 ms; passes too short to show at a sample are caught by searching each local elevation maximum. Checked against Skyfield's `find_events`: rise and set within 0.17 s, peak elevation within 0.013 deg ([`validation/passes-crosscheck.md`](validation/passes-crosscheck.md)).
- Sun position: the Astronomical Almanac low-precision series (0.01 deg, 1950 to 2050), returned as TEME; nutation (up to 17 arcseconds) and TT - UTC (69 s) are inside that.
- Eclipses: cylindrical shadow of the equatorial radius; no penumbra and no Earth flattening, so entry and exit are sharp where reality spreads them over 10 to 20 s in LEO. Checked against the closed-form shadow duration to 30 s.
- Visible to the eye means sunlit while the Sun is 6 deg or more below the station's horizon; brightness and weather are not considered.
- Doppler is first order (-f0 * range rate / c); the relativistic term (about 1e-10 of f0) is ignored.

## Analyses

- Conjunctions from element sets alone report miss distance only. Probability of collision is shown only where a real CDM provides a covariance.
- Decay estimates are ranges, never single dates.
- Manoeuvre detection is statistical and produces false positives from noisy fits; measured recall and false positives will be listed here (week 10).
