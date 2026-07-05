/**
 * Copernicus Data Space — Sentinel-1 Search Client
 *
 * Uses the CDSE OData v1 API to search for Sentinel-1 GRDH products
 * intersecting Nigerian port bounding boxes.
 *
 * Background: The old STAC endpoint (catalogue.dataspace.copernicus.eu/stac)
 * was deprecated for Sentinel-1 in 2025. The OData v1 catalog is the
 * currently supported API for Sentinel-1 discovery and download.
 *
 * OData docs: https://documentation.dataspace.copernicus.eu/APIs/OData.html
 */

import { CDSE } from "../config/settings.js";
import type { PortDefinition } from "../config/ports.js";

// ============================================================
// OData Product type (returned by catalogue OData API)
// ============================================================

export interface ODataProduct {
  Id: string;
  Name: string;
  ContentType: string;
  ContentLength: number;
  OriginDate: string;
  PublicationDate: string;
  ModificationDate: string;
  Online: boolean;
  ContentDate: {
    Start: string;
    End: string;
  };
  Footprint: string;        // WKT polygon
  GeoFootprint: {
    type: string;
    coordinates: number[][][][];
  };
}

/** Normalised product shape used by the rest of the pipeline */
export interface STACFeature {
  id: string;
  type: "Feature";
  geometry: { type: string; coordinates: number[][][] };
  properties: {
    datetime: string;
    "sar:instrument_mode"?: string;
    "sar:polarizations"?: string[];
    "s1:orbit_direction"?: string;
    title?: string;
    [key: string]: unknown;
  };
  links: Array<{ rel: string; href: string; type?: string }>;
  assets: Record<string, { href: string; type?: string; title?: string }>;
  // Raw OData record for download
  _odata?: ODataProduct;
}

export interface STACSearchResult {
  type: "FeatureCollection";
  features: STACFeature[];
  numberMatched?: number;
  numberReturned?: number;
}

// ============================================================
// OData Search
// ============================================================

/**
 * Search the CDSE OData v1 catalog for Sentinel-1 IW GRDH products.
 *
 * Filters:
 *  - Collection: SENTINEL-1
 *  - ProductType: IW_GRDH_1S   (Interferometric Wide Swath, Level-1 GRD High-Res)
 *  - Spatial: intersects the bbox
 *  - Temporal: between dateFrom and dateTo
 *
 * @param bbox [west, south, east, north]
 */
export async function searchSentinel1(
  bbox: [number, number, number, number],
  dateFrom: string,
  dateTo: string,
  limit: number = 10
): Promise<STACFeature[]> {
  const [west, south, east, north] = bbox;

  // Build WKT polygon from bbox for OData spatial filter
  const wkt = `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;

  // OData $filter expression
  const filter = [
    `Collection/Name eq 'SENTINEL-1'`,
    `Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'IW_GRDH_1S')`,
    `OData.CSC.Intersects(area=geography'SRID=4326;${wkt}')`,
    `ContentDate/Start gt ${dateFrom}T00:00:00.000Z`,
    `ContentDate/Start lt ${dateTo}T23:59:59.000Z`,
  ].join(" and ");

  const url = new URL(`${CDSE.ODATA_URL}/Products`);
  url.searchParams.set("$filter", filter);
  url.searchParams.set("$top", String(limit));
  url.searchParams.set("$orderby", "ContentDate/Start desc");
  url.searchParams.set(
    "$select",
    "Id,Name,ContentDate,Footprint,GeoFootprint,Online,ContentLength"
  );

  console.log(`[STAC] OData search — bbox [${bbox.join(", ")}]`);
  console.log(`[STAC] Date range: ${dateFrom} to ${dateTo}`);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `CDSE OData search failed (${response.status}): ${text.slice(0, 400)}`
    );
  }

  const result = await response.json() as { value: ODataProduct[] };
  const products = result.value ?? [];

  console.log(`[STAC] Found ${products.length} products`);

  // Normalise to STACFeature shape so the rest of the pipeline is unchanged
  return products.map((p) => odataToStacFeature(p));
}

/**
 * Convert an OData product record to the STACFeature shape.
 */
function odataToStacFeature(p: ODataProduct): STACFeature {
  return {
    id: p.Id,
    type: "Feature",
    geometry: p.GeoFootprint ?? { type: "Polygon", coordinates: [] },
    properties: {
      datetime: p.ContentDate.Start,
      title: p.Name,
      "sar:instrument_mode": "IW",
      "sar:polarizations": ["VV", "VH"],
    },
    links: [],
    assets: {
      PRODUCT: {
        href: `${CDSE.DOWNLOAD_BASE}/Products(${p.Id})/$value`,
        title: "Product download",
      },
    },
    _odata: p,
  };
}

// ============================================================
// Port-level helpers (same interface as before)
// ============================================================

/**
 * Search for the latest Sentinel-1 GRDH product for a specific port.
 */
export async function getLatestForPort(
  port: PortDefinition,
  lookbackDays: number = 12
): Promise<STACFeature | null> {
  const now = new Date();
  const from = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const dateFrom = from.toISOString().split("T")[0];
  const dateTo = now.toISOString().split("T")[0];

  const features = await searchSentinel1(port.bbox, dateFrom, dateTo, 1);
  return features.length > 0 ? features[0] : null;
}

/**
 * Get the download URL for a product from its assets.
 */
export function getProductDownloadUrl(feature: STACFeature): string | null {
  // OData direct download URL (most reliable)
  if (feature._odata?.Id) {
    return `${CDSE.DOWNLOAD_BASE}/Products(${feature._odata.Id})/$value`;
  }
  // Asset fallback
  const assetKeys = ["PRODUCT", "product", "data", "default"];
  for (const key of assetKeys) {
    if (feature.assets[key]?.href) return feature.assets[key].href;
  }
  return null;
}

/**
 * Get all available products for a port within a date range.
 */
export async function getProductsForPort(
  port: PortDefinition,
  dateFrom: string,
  dateTo: string,
  limit: number = 50
): Promise<STACFeature[]> {
  return searchSentinel1(port.bbox, dateFrom, dateTo, limit);
}
