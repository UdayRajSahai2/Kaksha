/**
 * Earth constants for frames and geodesy.
 *
 * Geodesy uses WGS-84. SGP4 itself uses WGS-72 gravity constants internally
 * (inside satellite.js); those are part of the SGP4 theory and are not mixed
 * with the values here.
 */
import { km } from './units.ts';

/** WGS-84 semi-major axis (equatorial radius). NIMA TR8350.2, 3rd ed., table 3.1. */
export const WGS84_A_KM = km(6378.137);

/** WGS-84 flattening, 1/298.257223563. NIMA TR8350.2, 3rd ed., table 3.1. */
export const WGS84_F = 1 / 298.257_223_563;

/** WGS-84 first eccentricity squared, e^2 = f(2 - f). */
export const WGS84_E2 = WGS84_F * (2 - WGS84_F);

/** WGS-84 semi-minor axis, b = a(1 - f). */
export const WGS84_B_KM = km(WGS84_A_KM * (1 - WGS84_F));
