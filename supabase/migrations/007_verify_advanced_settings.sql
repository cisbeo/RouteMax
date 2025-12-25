-- Verification script for advanced settings migration
-- This script checks if the columns were added successfully

-- Check routes table columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'routes'
  AND column_name IN ('lunch_break_start_time', 'lunch_break_duration_minutes', 'vehicle_type')
ORDER BY column_name;

-- Check route_stops table columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'route_stops'
  AND column_name = 'stop_type'
ORDER BY column_name;
