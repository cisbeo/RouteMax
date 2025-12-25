-- Add optimization_method column to routes table
-- This tracks which algorithm was used to create the route: simple_order or optimized

-- Add column with default value for backward compatibility
ALTER TABLE routes
  ADD COLUMN optimization_method VARCHAR(20) DEFAULT 'simple_order' NOT NULL;

-- Add constraint to ensure only valid values
ALTER TABLE routes
  ADD CONSTRAINT routes_optimization_method_check
  CHECK (optimization_method IN ('simple_order', 'optimized'));

-- Backfill existing routes (redundant with DEFAULT but explicit)
UPDATE routes
SET optimization_method = 'simple_order'
WHERE optimization_method IS NULL;

-- Add index for analytics and filtering queries
CREATE INDEX idx_routes_optimization_method
ON routes(user_id, optimization_method);
