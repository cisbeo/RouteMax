-- Create PostGIS function for polyline-based client suggestions
-- Uses ST_MakeLine to create a multi-segment route and ST_DWithin for corridor search

CREATE OR REPLACE FUNCTION suggest_clients_along_polyline(
  p_user_id UUID,
  p_points_json JSONB,  -- Array of {lat, lng} objects
  p_corridor_radius_m DOUBLE PRECISION DEFAULT 10000,
  p_max_results INTEGER DEFAULT 30
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
  point_record RECORD;
  points_array GEOMETRY[];
BEGIN
  -- Build array of points from JSON
  FOR point_record IN
    SELECT
      (elem->>'lng')::DOUBLE PRECISION AS lng,
      (elem->>'lat')::DOUBLE PRECISION AS lat
    FROM jsonb_array_elements(p_points_json) AS elem
  LOOP
    points_array := array_append(
      points_array,
      ST_SetSRID(ST_MakePoint(point_record.lng, point_record.lat), 4326)
    );
  END LOOP;

  -- Create LineString from points array
  route_line := ST_MakeLine(points_array);

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.address,
    c.lat,
    c.lng,
    c.is_active,
    c.created_at,
    ST_Distance(c.geom::geography, route_line::geography) AS distance_meters,
    GREATEST(0, 100 - (ST_Distance(c.geom::geography, route_line::geography) / p_corridor_radius_m) * 100) AS score
  FROM clients c
  WHERE
    c.user_id = p_user_id
    AND c.is_active = true
    AND c.geom IS NOT NULL
    AND ST_DWithin(c.geom::geography, route_line::geography, p_corridor_radius_m)
  ORDER BY distance_meters ASC
  LIMIT p_max_results;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION suggest_clients_along_polyline TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION suggest_clients_along_polyline IS
  'Returns clients within a corridor along a multi-point polyline route, scored by proximity to the line. Used for loop routes with existing waypoints.';
