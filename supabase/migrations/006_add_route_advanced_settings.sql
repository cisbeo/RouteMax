-- Add advanced route configuration features
-- Part 1: Lunch break scheduling
-- Part 2: Vehicle type selection

-- Add lunch break fields to routes table
ALTER TABLE routes
  ADD COLUMN lunch_break_start_time TIME,
  ADD COLUMN lunch_break_duration_minutes INTEGER DEFAULT 60;

-- Add vehicle type to routes table
ALTER TABLE routes
  ADD COLUMN vehicle_type VARCHAR(20) DEFAULT 'driving';

-- Add comment for vehicle type values
COMMENT ON COLUMN routes.vehicle_type IS 'Vehicle type for route calculation: driving, bicycling, or walking';

-- Add stop_type to route_stops for distinguishing different stop types
ALTER TABLE route_stops
  ADD COLUMN stop_type VARCHAR(20) DEFAULT 'client';

-- Add comment for stop_type values
COMMENT ON COLUMN route_stops.stop_type IS 'Type of stop: start, client, break, or end';
