-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to clients table for spatial queries
ALTER TABLE clients ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

-- Update existing rows with geometry data
UPDATE clients
SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE geom IS NULL;

-- Create spatial index using GIST
CREATE INDEX IF NOT EXISTS idx_clients_geom ON clients USING GIST(geom);

-- Create trigger to auto-update geometry when lat/lng changes
CREATE OR REPLACE FUNCTION update_client_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_geom
  BEFORE INSERT OR UPDATE OF lat, lng ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_client_geom();
