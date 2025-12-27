-- Create PostGIS function for bounding box client suggestions
-- Used for loop routes where start === end, or when waypoints are provided

CREATE OR REPLACE FUNCTION suggest_clients_in_bbox(
  p_user_id UUID,
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
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
  bbox GEOMETRY;
  center_point GEOMETRY;
  max_distance DOUBLE PRECISION;
BEGIN
  -- Create bounding box envelope
  bbox := ST_SetSRID(
    ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat),
    4326
  );

  -- Calculate center point for distance scoring
  center_point := ST_SetSRID(
    ST_MakePoint(
      (p_min_lng + p_max_lng) / 2,
      (p_min_lat + p_max_lat) / 2
    ),
    4326
  );

  -- Calculate max distance (corner to center) for score normalization
  max_distance := ST_Distance(
    center_point::geography,
    ST_SetSRID(ST_MakePoint(p_min_lng, p_min_lat), 4326)::geography
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
    -- Distance from center of bbox
    ST_Distance(c.geom::geography, center_point::geography) AS distance_meters,
    -- Score: 100 at center, decreasing towards edges
    GREATEST(0, 100 - (ST_Distance(c.geom::geography, center_point::geography) / NULLIF(max_distance, 0)) * 100) AS score
  FROM clients c
  WHERE
    c.user_id = p_user_id
    AND c.is_active = true
    AND c.geom IS NOT NULL
    -- Filter clients within bounding box
    AND ST_Within(c.geom, bbox)
  ORDER BY score DESC
  LIMIT p_max_results;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION suggest_clients_in_bbox TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION suggest_clients_in_bbox IS
  'Returns clients within a bounding box, scored by proximity to center. Used for loop routes or multi-waypoint suggestions.';
