-- Create route_stops table
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  stop_order INTEGER NOT NULL,
  estimated_arrival TIMESTAMP,
  estimated_departure TIMESTAMP,
  duration_from_previous_minutes INTEGER DEFAULT 0,
  distance_from_previous_km FLOAT DEFAULT 0,
  visit_duration_minutes INTEGER DEFAULT 20,
  is_included BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops(route_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_route_stops_client_id ON route_stops(client_id);

-- Enable Row Level Security
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view stops for their routes"
  ON route_stops FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM routes
    WHERE routes.id = route_stops.route_id
    AND routes.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert stops for their routes"
  ON route_stops FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM routes
    WHERE routes.id = route_stops.route_id
    AND routes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update stops for their routes"
  ON route_stops FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM routes
    WHERE routes.id = route_stops.route_id
    AND routes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete stops for their routes"
  ON route_stops FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM routes
    WHERE routes.id = route_stops.route_id
    AND routes.user_id = auth.uid()
  ));
