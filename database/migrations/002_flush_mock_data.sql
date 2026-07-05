-- Migration 002: Flush all synthetic MOCK data from the database
-- Run ONLY when you are ready to ingest real Sentinel-1 data and the
-- ONNX model file exists at pipeline/models/yolov8-vessel.onnx.
--
-- This is a DESTRUCTIVE operation — all mock detections and images
-- will be permanently deleted. Statistics will be reset.
--
-- Usage:
--   psql "$DATABASE_URL" -f database/migrations/002_flush_mock_data.sql
--
-- Safety check: The migration will abort if no MOCK records are found,
-- so it is safe to run again after a partial cleanup.

BEGIN;

-- ── Count before ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  mock_image_count INT;
  mock_detection_count INT;
BEGIN
  SELECT COUNT(*) INTO mock_image_count
  FROM images WHERE product_id LIKE '%_MOCK_%';

  SELECT COUNT(*) INTO mock_detection_count
  FROM detections
  WHERE image_id IN (SELECT id FROM images WHERE product_id LIKE '%_MOCK_%');

  RAISE NOTICE 'Found % mock image(s) with % detection(s) to delete',
    mock_image_count, mock_detection_count;

  IF mock_image_count = 0 THEN
    RAISE EXCEPTION 'No MOCK records found — migration aborted (nothing to delete)';
  END IF;
END $$;

-- ── Delete mock detections (cascade would handle this, but being explicit) ────
DELETE FROM detections
WHERE image_id IN (
  SELECT id FROM images WHERE product_id LIKE '%_MOCK_%'
);

-- ── Delete mock image records ─────────────────────────────────────────────────
DELETE FROM images
WHERE product_id LIKE '%_MOCK_%';

-- ── Reset aggregation tables (will be rebuilt from real data) ─────────────────
-- Note: TRUNCATE is faster than DELETE for large tables.
TRUNCATE daily_statistics RESTART IDENTITY CASCADE;
TRUNCATE monthly_statistics RESTART IDENTITY CASCADE;

-- ── Verify the cleanup ────────────────────────────────────────────────────────
DO $$
DECLARE
  remaining_detections INT;
  remaining_images INT;
  remaining_mock_images INT;
BEGIN
  SELECT COUNT(*) INTO remaining_detections FROM detections;
  SELECT COUNT(*) INTO remaining_images FROM images;
  SELECT COUNT(*) INTO remaining_mock_images
  FROM images WHERE product_id LIKE '%_MOCK_%';

  IF remaining_mock_images > 0 THEN
    RAISE EXCEPTION 'Cleanup incomplete: % MOCK image(s) still present', remaining_mock_images;
  END IF;

  RAISE NOTICE 'Migration 002 complete:';
  RAISE NOTICE '  Remaining real detections: %', remaining_detections;
  RAISE NOTICE '  Remaining real images:     %', remaining_images;
  RAISE NOTICE '  Daily/monthly stats: cleared (will be rebuilt on next pipeline run)';
END $$;

COMMIT;

-- ── Final status ──────────────────────────────────────────────────────────────
SELECT
  'ports'             AS table_name, COUNT(*)::int AS rows FROM ports
UNION ALL
SELECT
  'images'            AS table_name, COUNT(*)::int AS rows FROM images
UNION ALL
SELECT
  'detections'        AS table_name, COUNT(*)::int AS rows FROM detections
UNION ALL
SELECT
  'daily_statistics'  AS table_name, COUNT(*)::int AS rows FROM daily_statistics
UNION ALL
SELECT
  'monthly_statistics' AS table_name, COUNT(*)::int AS rows FROM monthly_statistics
ORDER BY table_name;
