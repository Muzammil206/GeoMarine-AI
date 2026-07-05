/**
 * Spatial Utilities
 *
 * Turf.js-based spatial analysis functions for port boundary
 * operations and detection spatial joins.
 */

import * as turf from "@turf/turf";
import type { PortDefinition } from "../config/ports.js";

/**
 * Check if a point [lon, lat] falls within a port's boundary polygon.
 */
export function isPointInPort(
  lon: number,
  lat: number,
  port: PortDefinition
): boolean {
  const point = turf.point([lon, lat]);
  const polygon = turf.polygon([port.polygon]);
  return turf.booleanPointInPolygon(point, polygon);
}

/**
 * Find which port a detection point belongs to.
 * Returns the port definition or null if the point isn't in any port.
 */
export function assignToPort(
  lon: number,
  lat: number,
  ports: PortDefinition[]
): PortDefinition | null {
  for (const port of ports) {
    if (isPointInPort(lon, lat, port)) {
      return port;
    }
  }
  return null;
}

/**
 * Compute the area of a port boundary in square kilometers.
 */
export function getPortAreaKm2(port: PortDefinition): number {
  const polygon = turf.polygon([port.polygon]);
  return turf.area(polygon) / 1_000_000; // m² → km²
}

/**
 * Get the centroid of a port boundary.
 */
export function getPortCentroid(
  port: PortDefinition
): [number, number] {
  const polygon = turf.polygon([port.polygon]);
  const centroid = turf.centroid(polygon);
  return centroid.geometry.coordinates as [number, number];
}

/**
 * Check if two bounding boxes overlap.
 */
export function bboxOverlap(
  a: [number, number, number, number],
  b: [number, number, number, number]
): boolean {
  return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
}
