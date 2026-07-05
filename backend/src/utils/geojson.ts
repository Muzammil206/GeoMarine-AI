/**
 * GeoJSON Utilities
 *
 * Helpers for building GeoJSON FeatureCollections from PostGIS query results.
 */

export interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJSON.Geometry;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

/**
 * Build a GeoJSON FeatureCollection from database rows.
 * Expects rows to have a `geometry` field (parsed JSON from ST_AsGeoJSON).
 */
export function toFeatureCollection(
  rows: Array<Record<string, unknown>>,
  geometryField: string = "geometry"
): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = rows.map((row) => {
    const geometry = row[geometryField] as GeoJSON.Geometry;
    const properties = { ...row };
    delete properties[geometryField];

    return {
      type: "Feature",
      properties,
      geometry,
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Build a single GeoJSON Feature.
 */
export function toFeature(
  row: Record<string, unknown>,
  geometryField: string = "geometry"
): GeoJSONFeature {
  const geometry = row[geometryField] as GeoJSON.Geometry;
  const properties = { ...row };
  delete properties[geometryField];

  return {
    type: "Feature",
    properties,
    geometry,
  };
}
