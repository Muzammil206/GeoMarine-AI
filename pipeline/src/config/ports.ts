/**
 * Nigerian Port Definitions
 *
 * Each port is defined with its center coordinates, approximate bounding box
 * for satellite image queries, and a polygon boundary for spatial analysis.
 * Coordinates are in WGS84 (EPSG:4326): [longitude, latitude].
 */

export interface PortDefinition {
  name: string;
  state: string;
  description: string;
  center: [number, number]; // [lon, lat]
  bbox: [number, number, number, number]; // [west, south, east, north]
  polygon: [number, number][]; // ring of [lon, lat] coordinates
}

export const NIGERIAN_PORTS: PortDefinition[] = [
  {
    // Lagos Harbour main navigable channel — excludes Apapa terminal buildings,
    // container yards and Lagos Island residential to the east.
    name: "Apapa Port",
    state: "Lagos",
    description:
      "Largest and busiest port in Nigeria, located in Lagos. Handles containerized and general cargo.",
    center: [3.3885, 6.4445],
    bbox: [3.360, 6.425, 3.420, 6.465],
    polygon: [
      [3.3700, 6.4320], // SW — open harbour water
      [3.4060, 6.4320], // SE — harbour entrance
      [3.4100, 6.4420], // E  — midchannel east
      [3.4060, 6.4550], // NE — inner harbour north
      [3.3820, 6.4580], // N  — Apapa quay waterline
      [3.3680, 6.4510], // NW — Lagos harbour west
      [3.3620, 6.4390], // W  — western approach
      [3.3700, 6.4320], // close ring
    ],
  },
  {
    // Channel between Tin Can Island and the Apapa mainland — a narrow tidal creek.
    // Excludes the island terminal surface and container parks.
    name: "Tin Can Island Port",
    state: "Lagos",
    description:
      "Second major port in Lagos, handles containers, vehicles, dry and liquid bulk cargo.",
    center: [3.3430, 6.4300],
    bbox: [3.318, 6.410, 3.368, 6.450],
    polygon: [
      [3.3200, 6.4140], // SW — channel south mouth
      [3.3600, 6.4140], // SE — south approach
      [3.3640, 6.4220], // E  — channel midpoint east
      [3.3620, 6.4420], // NE — inner creek north
      [3.3460, 6.4460], // N  — Tin Can north quay
      [3.3240, 6.4390], // NW — Badagry creek junction
      [3.3160, 6.4260], // W  — channel west bank
      [3.3200, 6.4140], // close ring
    ],
  },
  {
    // Onne Creek navigable section — oil & gas terminal on the west, creek east.
    // Excludes NLNG refinery land to the north and farmland to the south.
    name: "Onne Port",
    state: "Rivers",
    description:
      "Federal Ocean Terminal and Federal Lighter Terminal. Major oil and gas logistics hub.",
    center: [7.1580, 4.6870],
    bbox: [7.125, 4.655, 7.192, 4.720],
    polygon: [
      [7.1290, 4.6590], // SW — creek south
      [7.1760, 4.6590], // SE — Onne FOT quay
      [7.1840, 4.6720], // E  — terminal east face
      [7.1820, 4.7060], // NE — upper terminal north
      [7.1620, 4.7120], // N  — creek bend north
      [7.1340, 4.7010], // NW — west creek bank
      [7.1260, 4.6820], // W  — channel midpoint
      [7.1290, 4.6590], // close ring
    ],
  },
  {
    // Calabar River navigable channel — S-bend around the port quay.
    // Excludes Calabar city waterfront land and Marina Road infrastructure.
    name: "Calabar Port",
    state: "Cross River",
    description:
      "Located on the Calabar River, handles general cargo and some containerized freight.",
    center: [8.3180, 4.9740],
    bbox: [8.292, 4.948, 8.348, 5.002],
    polygon: [
      [8.2960, 4.9520], // SW — river south approach
      [8.3380, 4.9520], // SE — eastern bank south
      [8.3440, 4.9680], // E  — Calabar Harbour east
      [8.3460, 4.9940], // NE — upper river north
      [8.3240, 4.9980], // N  — creek bend north
      [8.3000, 4.9880], // NW — western bank upper
      [8.2940, 4.9720], // W  — midchannel west
      [8.2960, 4.9520], // close ring
    ],
  },
  {
    // Warri River channel at the Port Complex — narrow river between
    // Warri city to the east and Udu to the west.
    name: "Warri Port",
    state: "Delta",
    description:
      "Also known as Delta Port Complex. Located on the Warri River, handles general and bulk cargo.",
    center: [5.7510, 5.5155],
    bbox: [5.722, 5.490, 5.782, 5.542],
    polygon: [
      [5.7260, 5.4920], // SW — river south approach
      [5.7680, 5.4920], // SE — east bank south
      [5.7760, 5.5060], // E  — quay east face
      [5.7740, 5.5340], // NE — upper river north
      [5.7560, 5.5400], // N  — creek north bend
      [5.7300, 5.5310], // NW — west bank upper
      [5.7220, 5.5120], // W  — channel midpoint
      [5.7260, 5.4920], // close ring
    ],
  },
  {
    // Bonny River channel at Port Harcourt — wide tidal estuary.
    // Excludes the city waterfront, Creek Road and Trans-Amadi Industrial area.
    name: "Port Harcourt Port",
    state: "Rivers",
    description:
      "Located on the Bonny River. Handles general cargo, containers, and petroleum products.",
    center: [7.0134, 4.7740],
    bbox: [6.980, 4.748, 7.048, 4.804],
    polygon: [
      [6.9840, 4.7520], // SW — Bonny River south
      [7.0360, 4.7520], // SE — east bank south
      [7.0440, 4.7660], // E  — PHC Quay east
      [7.0420, 4.7980], // NE — upper river north
      [7.0200, 4.8020], // N  — Trans-Amadi creek mouth
      [6.9960, 4.7940], // NW — west bank upper
      [6.9820, 4.7780], // W  — channel midpoint
      [6.9840, 4.7520], // close ring
    ],
  },
];

/**
 * Get the combined bounding box covering all Nigerian ports.
 * Useful for broad Sentinel-1 catalog queries.
 */
export function getAllPortsBbox(): [number, number, number, number] {
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity;

  for (const port of NIGERIAN_PORTS) {
    west = Math.min(west, port.bbox[0]);
    south = Math.min(south, port.bbox[1]);
    east = Math.max(east, port.bbox[2]);
    north = Math.max(north, port.bbox[3]);
  }

  return [west, south, east, north];
}
