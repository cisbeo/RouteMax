-- Create PostGIS function for efficient spatial client suggestions
-- Uses ST_MakeLine to create route corridor and ST_DWithin for proximity filter

CREATE OR REPLACE FUNCTION suggest_clients_along_route(
  p_user_id UUID,
  p_start_lng DOUBLE PRECISION,
  p_start_lat DOUBLE PRECISION,
  p_end_lng DOUBLE PRECISION,
  p_end_lat DOUBLE PRECISION,
  p_corridor_radius_m DOUBLE PRECISION DEFAULT 5000,
  p_max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  distance_meters DOUBLE PRECISION,
  score DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  route_line GEOMETRY;
BEGIN
  -- Create line from start to end point
  route_line := ST_SetSRID(
    ST_MakeLine(
      ST_MakePoint(p_start_lng, p_start_lat),
      ST_MakePoint(p_end_lng, p_end_lat)
    ),
    4326
  );

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.address,
    c.lat,
    c.lng,
    c.is_active,
    c.created_at,
    -- Calculate distance in meters using geography cast
    ST_Distance(c.geom::geography, route_line::geography) AS distance_meters,
    -- Score: 100 at center, 0 at edge of corridor
    GREATEST(0, 100 - (ST_Distance(c.geom::geography, route_line::geography) / p_corridor_radius_m) * 100) AS score
  FROM clients c
  WHERE
    c.user_id = p_user_id
    AND c.is_active = true
    AND c.geom IS NOT NULL
    -- Filter clients within corridor using spatial index
    AND ST_DWithin(
      c.geom::geography,
      route_line::geography,
      p_corridor_radius_m
    )
  ORDER BY score DESC
  LIMIT p_max_results;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION suggest_clients_along_route TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION suggest_clients_along_route IS
  'Returns clients within a corridor along a route line, scored by proximity. Uses PostGIS spatial index for performance.';
