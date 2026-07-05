-- Migration 001: Replace rectangular port polygons with traced water-channel polygons
-- Run against live Neon PostGIS database BEFORE the next pipeline run.
-- This updates the geometry stored in the ports table to match the corrected
-- water-only polygons now in pipeline/src/config/ports.ts.
--
-- Usage:
--   psql "$DATABASE_URL" -f database/migrations/001_update_port_polygons.sql

BEGIN;

-- Apapa Port — Lagos Harbour main navigable channel
-- Excludes Apapa terminal buildings, container yards and Lagos Island residential.
UPDATE ports SET
  geom = ST_SetSRID(ST_GeomFromText('POLYGON((
    3.3700 6.4320,
    3.4060 6.4320,
    3.4100 6.4420,
    3.4060 6.4550,
    3.3820 6.4580,
    3.3680 6.4510,
    3.3620 6.4390,
    3.3700 6.4320
  ))'), 4326),
  updated_at = NOW()
WHERE name = 'Apapa Port';

-- Tin Can Island Port — channel between Tin Can Island and Apapa mainland
-- Excludes island terminal surface and container parks.
UPDATE ports SET
  geom = ST_SetSRID(ST_GeomFromText('POLYGON((
    3.3200 6.4140,
    3.3600 6.4140,
    3.3640 6.4220,
    3.3620 6.4420,
    3.3460 6.4460,
    3.3240 6.4390,
    3.3160 6.4260,
    3.3200 6.4140
  ))'), 4326),
  updated_at = NOW()
WHERE name = 'Tin Can Island Port';

-- Onne Port — Onne Creek navigable section
-- Excludes NLNG refinery land to the north and farmland to the south.
UPDATE ports SET
  geom = ST_SetSRID(ST_GeomFromText('POLYGON((
    7.1290 4.6590,
    7.1760 4.6590,
    7.1840 4.6720,
    7.1820 4.7060,
    7.1620 4.7120,
    7.1340 4.7010,
    7.1260 4.6820,
    7.1290 4.6590
  ))'), 4326),
  updated_at = NOW()
WHERE name = 'Onne Port';

-- Calabar Port — Calabar River navigable channel
-- Excludes Calabar city waterfront land and Marina Road infrastructure.
UPDATE ports SET
  geom = ST_SetSRID(ST_GeomFromText('POLYGON((
    8.2960 4.9520,
    8.3380 4.9520,
    8.3440 4.9680,
    8.3460 4.9940,
    8.3240 4.9980,
    8.3000 4.9880,
    8.2940 4.9720,
    8.2960 4.9520
  ))'), 4326),
  updated_at = NOW()
WHERE name = 'Calabar Port';

-- Warri Port — Warri River channel at the Port Complex
-- Excludes Warri city to the east and Udu to the west.
UPDATE ports SET
  geom = ST_SetSRID(ST_GeomFromText('POLYGON((
    5.7260 5.4920,
    5.7680 5.4920,
    5.7760 5.5060,
    5.7740 5.5340,
    5.7560 5.5400,
    5.7300 5.5310,
    5.7220 5.5120,
    5.7260 5.4920
  ))'), 4326),
  updated_at = NOW()
WHERE name = 'Warri Port';

-- Port Harcourt Port — Bonny River channel
-- Excludes the city waterfront, Creek Road and Trans-Amadi Industrial area.
UPDATE ports SET
  geom = ST_SetSRID(ST_GeomFromText('POLYGON((
    6.9840 4.7520,
    7.0360 4.7520,
    7.0440 4.7660,
    7.0420 4.7980,
    7.0200 4.8020,
    6.9960 4.7940,
    6.9820 4.7780,
    6.9840 4.7520
  ))'), 4326),
  updated_at = NOW()
WHERE name = 'Port Harcourt Port';

-- Verify all 6 ports were updated
DO $$
DECLARE
  update_count INT;
BEGIN
  SELECT COUNT(*) INTO update_count
  FROM ports
  WHERE updated_at > NOW() - INTERVAL '1 minute';

  IF update_count < 6 THEN
    RAISE EXCEPTION 'Expected 6 port updates, only got %', update_count;
  END IF;
  RAISE NOTICE 'Migration 001 complete: % ports updated', update_count;
END $$;

-- Show the new geometries for visual verification
SELECT
  name,
  ST_AsText(geom) AS wkt,
  ST_Area(geom::geography) / 1000000 AS area_km2,
  ST_Perimeter(geom::geography) / 1000 AS perimeter_km
FROM ports
ORDER BY id;

COMMIT;
