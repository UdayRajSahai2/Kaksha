# SGP4 verification vectors

Reference test cases for SGP4/SDP4 from Vallado, Crawford, Hujsak and Kelso, "Revisiting Spacetrack Report #3", AIAA 2006-6753 (published with the paper at celestrak.org/publications/AIAA/2006-6753/).

| File | Holds |
| --- | --- |
| `SGP4-VER.TLE` | 33 test element sets; after column 69 of line 2: start, stop and step in minutes from epoch |
| `tcppver.out` | Vallado's C++ output for each case: minutes from epoch, TEME position (km), TEME velocity (km/s). Only steps that propagated without error are listed |

Copied unchanged from the python-sgp4 2.27 source distribution (PyPI), which redistributes them under the MIT licence in `LICENSE-python-sgp4`.

| File | SHA-256 |
| --- | --- |
| `SGP4-VER.TLE` | `d246d1d9d768ace445a38a965713fa9ba52d80fd8a41a0502ff83d7acffe2881` |
| `tcppver.out` | `687bf28dbe52df86e8e60ab5cb4a08d1aa3dbcaf4e63b1f7ab95f044fbe3833b` |

Used only by tests (`sgp4.verification.test.ts`). The results table is in [`docs/validation/sgp4-verification.md`](../../../../../docs/validation/sgp4-verification.md).
