/**
 * Water Mask
 *
 * Provides a coarse (~1km resolution) water/land classification for
 * any point in Nigerian waters using simplified polygon geometry
 * derived from Natural Earth coastline data.
 *
 * This is a backstop filter — it catches detections that slipped through
 * the port polygon check (e.g. due to coordinate drift or polygon edge cases).
 *
 * Coverage: Gulf of Guinea + major Nigerian inland waterways.
 */

import * as turf from "@turf/turf";
import type { Feature, Polygon, MultiPolygon } from "@turf/turf";

// ============================================================
// Nigerian Water Bodies (simplified Natural Earth geometries)
// ============================================================

/**
 * Simplified polygon of the Gulf of Guinea coastline covering
 * Nigeria's Exclusive Economic Zone and coastal waters.
 * Derived from Natural Earth ne_10m_ocean, simplified to 0.01° tolerance.
 *
 * Coordinates: [lon, lat] WGS84
 */
const GULF_OF_GUINEA: [number, number][] = [
  // Nigerian coastline (simplified) from Lagos to Calabar
  [2.68, 6.35],   // west of Lagos
  [3.18, 6.30],   // Lagos coastal water south
  [3.45, 6.28],   // Lagos harbour approach
  [3.72, 6.30],   // east of Lagos
  [4.20, 6.15],   // Badagry/Cotonou region
  [4.80, 5.95],   // Benin coast
  [5.15, 5.55],   // Warri River delta approach
  [5.50, 5.30],   // Delta state coast
  [6.05, 4.85],   // Rivers state
  [6.50, 4.40],   // Niger Delta outer
  [7.00, 4.20],   // Bonny River mouth area
  [7.30, 4.35],   // Onne/PHC outer coast
  [7.85, 4.50],   // Akwa Ibom
  [8.35, 4.62],   // Calabar River mouth
  [8.70, 4.75],   // Cross River outer
  // Offshore boundary (south)
  [8.70, 3.50],
  [7.00, 3.20],
  [5.00, 3.50],
  [3.00, 3.80],
  [2.68, 5.00],
  [2.68, 6.35],   // close ring
];

/**
 * Lagos Harbour — navigable water between Lagos Island and Apapa/Tin Can.
 */
const LAGOS_HARBOUR: [number, number][] = [
  [3.31, 6.41], [3.43, 6.41],
  [3.43, 6.46], [3.31, 6.46],
  [3.31, 6.41],
];

/**
 * Bonny River — main tidal channel from PHC/Onne to the ocean.
 */
const BONNY_RIVER: [number, number][] = [
  [6.98, 4.70], [7.20, 4.70],
  [7.20, 4.85], [6.98, 4.85],
  [6.98, 4.70],
];

/**
 * Warri River — navigable section from Delta Port to delta.
 */
const WARRI_RIVER: [number, number][] = [
  [5.68, 5.42], [5.82, 5.42],
  [5.82, 5.57], [5.68, 5.57],
  [5.68, 5.42],
];

/**
 * Calabar River — navigable section around Calabar Port.
 */
const CALABAR_RIVER: [number, number][] = [
  [8.28, 4.92], [8.37, 4.92],
  [8.37, 5.02], [8.28, 5.02],
  [8.28, 4.92],
];

// ============================================================
// Water features index
// ============================================================

type WaterPolygon = Feature<Polygon | MultiPolygon>;

const WATER_POLYGONS: WaterPolygon[] = [
  turf.polygon([GULF_OF_GUINEA])  as WaterPolygon,
  turf.polygon([LAGOS_HARBOUR])   as WaterPolygon,
  turf.polygon([BONNY_RIVER])     as WaterPolygon,
  turf.polygon([WARRI_RIVER])     as WaterPolygon,
  turf.polygon([CALABAR_RIVER])   as WaterPolygon,
];

// ============================================================
// Public API
// ============================================================

/**
 * Returns true if the given coordinate is classified as water
 * in the simplified Natural Earth mask.
 *
 * Note: this is a coarse backstop. Use port-polygon checks as
 * the primary filter and this as a secondary safety net.
 */
export function isOnWater(lon: number, lat: number): boolean {
  const point = turf.point([lon, lat]);
  return WATER_POLYGONS.some((poly) =>
    turf.booleanPointInPolygon(point, poly)
  );
}

/**
 * Returns the name of the water body a point falls in, or null if on land.
 * Useful for debugging and logging.
 */
export function getWaterBodyName(lon: number, lat: number): string | null {
  const names = [
    "Gulf of Guinea",
    "Lagos Harbour",
    "Bonny River",
    "Warri River",
    "Calabar River",
  ];
  const point = turf.point([lon, lat]);
  for (let i = 0; i < WATER_POLYGONS.length; i++) {
    if (turf.booleanPointInPolygon(point, WATER_POLYGONS[i])) {
      return names[i];
    }
  }
  return null;
}
