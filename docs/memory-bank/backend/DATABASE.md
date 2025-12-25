# RouteMax Database Schema

## Overview

RouteMax uses **Supabase (PostgreSQL)** with **PostGIS** extension for spatial queries and route optimization.

**Migrations**: @supabase/migrations/

## Schema Diagram

```
auth.users (Supabase Auth)
    ↓
clients (geocoded customer locations)
    ↓
routes (optimized delivery routes)
    ↓
route_stops (ordered stops with timing)
```

## Tables

### `clients`

Customer locations with geocoding and spatial data.

**Columns:**
- `id` UUID (PK)
- `user_id` UUID (FK → auth.users)
- `name` TEXT
- `address` TEXT
- `lat` FLOAT
- `lng` FLOAT
- `geom` GEOMETRY(Point, 4326) - PostGIS spatial column
- `geocoded_at` TIMESTAMP
- `is_active` BOOLEAN
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**Indexes:**
- `idx_clients_user_id` on `user_id`
- `idx_clients_active` on `user_id, is_active`
- `idx_clients_geom` GIST spatial index on `geom`

**Triggers:**
- `update_clients_updated_at` - auto-updates `updated_at`
- `trigger_update_client_geom` - auto-syncs `geom` from `lat`/`lng`

**RLS Policies:**
- Users can only CRUD their own clients (scoped by `user_id`)

---

### `routes`

Optimized delivery routes with start/end points and metadata.

**Columns:**
- `id` UUID (PK)
- `user_id` UUID (FK → auth.users)
- `name` TEXT
- `start_address` TEXT
- `start_lat` FLOAT
- `start_lng` FLOAT
- `start_datetime` TIMESTAMP
- `end_address` TEXT
- `end_lat` FLOAT
- `end_lng` FLOAT
- `end_datetime` TIMESTAMP
- `total_distance_km` FLOAT
- `total_duration_minutes` INTEGER
- `total_visits` INTEGER
- `optimization_metadata` JSONB - stores algorithm results
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

**Indexes:**
- `idx_routes_user_id` on `user_id`
- `idx_routes_created_at` on `user_id, created_at DESC`

**Triggers:**
- `update_routes_updated_at` - auto-updates `updated_at`

**RLS Policies:**
- Users can only CRUD their own routes (scoped by `user_id`)

---

### `route_stops`

Individual stops in a route with ordering and timing estimates.

**Columns:**
- `id` UUID (PK)
- `route_id` UUID (FK → routes, CASCADE delete)
- `client_id` UUID (FK → clients, SET NULL on delete)
- `address` TEXT
- `lat` FLOAT
- `lng` FLOAT
- `stop_order` INTEGER - sequence in route
- `estimated_arrival` TIMESTAMP
- `estimated_departure` TIMESTAMP
- `duration_from_previous_minutes` INTEGER
- `distance_from_previous_km` FLOAT
- `visit_duration_minutes` INTEGER (default: 20)
- `is_included` BOOLEAN - for route exclusions
- `created_at` TIMESTAMP

**Indexes:**
- `idx_route_stops_route_id` on `route_id, stop_order`
- `idx_route_stops_client_id` on `client_id`

**RLS Policies:**
- Users can CRUD stops only for routes they own (via JOIN with `routes.user_id`)

---

## PostGIS Spatial Features

### Extension Setup
@supabase/migrations/002_enable_postgis.sql

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Spatial Column: `clients.geom`

- **Type**: `GEOMETRY(Point, 4326)`
- **SRID**: 4326 (WGS 84 - standard GPS coordinates)
- **Index**: GIST for fast spatial queries

### Auto-sync Trigger

```sql
CREATE OR REPLACE FUNCTION update_client_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Fired on**: INSERT or UPDATE of `lat`/`lng` columns

### Common Spatial Queries

**Find clients within radius:**
```sql
SELECT * FROM clients
WHERE ST_DWithin(
  geom::geography,
  ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
  $radius_meters
);
```

**Calculate distance between points:**
```sql
SELECT ST_Distance(
  geom1::geography,
  geom2::geography
) AS distance_meters;
```

**Nearest neighbors:**
```sql
SELECT * FROM clients
ORDER BY geom <-> ST_SetSRID(ST_MakePoint($lng, $lat), 4326)
LIMIT 10;
```

---

## Row Level Security (RLS)

**All tables** have RLS enabled with user-scoped policies.

### Policy Pattern: `clients` and `routes`
- Direct `user_id` check: `auth.uid() = user_id`
- Applied to: SELECT, INSERT, UPDATE, DELETE

### Policy Pattern: `route_stops`
- Indirect via JOIN: Check if parent route belongs to user
```sql
EXISTS (
  SELECT 1 FROM routes
  WHERE routes.id = route_stops.route_id
  AND routes.user_id = auth.uid()
)
```

**Security guarantee**: Users cannot access data owned by other users.

---

## Access Patterns

### 1. Client Management
```sql
-- List active clients for user
SELECT * FROM clients
WHERE user_id = auth.uid() AND is_active = true
ORDER BY name;

-- Spatial proximity search
SELECT * FROM clients
WHERE ST_DWithin(
  geom::geography,
  ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
  5000 -- 5km radius
);
```

### 2. Route Creation
```sql
-- Insert route with metadata
INSERT INTO routes (user_id, name, start_lat, start_lng, ...)
VALUES (auth.uid(), 'Morning Route', ...);

-- Bulk insert stops
INSERT INTO route_stops (route_id, client_id, stop_order, ...)
SELECT ... FROM unnest($stops);
```

### 3. Route Retrieval
```sql
-- Get route with all stops
SELECT
  r.*,
  json_agg(rs.* ORDER BY rs.stop_order) AS stops
FROM routes r
LEFT JOIN route_stops rs ON r.id = rs.route_id
WHERE r.user_id = auth.uid() AND r.id = $route_id
GROUP BY r.id;
```

### 4. Analytics
```sql
-- Total distance by user
SELECT SUM(total_distance_km) FROM routes
WHERE user_id = auth.uid();

-- Most visited clients
SELECT c.name, COUNT(rs.id) AS visit_count
FROM clients c
JOIN route_stops rs ON c.id = rs.client_id
JOIN routes r ON rs.route_id = r.id
WHERE r.user_id = auth.uid()
GROUP BY c.id, c.name
ORDER BY visit_count DESC;
```

---

## Performance Optimizations

### Indexes
- **Composite**: `(user_id, is_active)` for filtered client lists
- **Spatial GIST**: Fast proximity searches on `clients.geom`
- **Ordering**: `(user_id, created_at DESC)` for recent routes
- **Foreign keys**: `route_id, stop_order` for stop retrieval

### Triggers
- Auto-maintain `updated_at` on changes
- Auto-sync `geom` from `lat`/`lng` changes
- No manual geometry updates needed

### JSONB Metadata
- `routes.optimization_metadata` stores algorithm parameters
- Allows flexible schema for different optimization strategies
- No additional tables needed for algorithm-specific data

---

## Migration Order

1. **001_create_clients_table.sql** - Base client data with RLS
2. **002_enable_postgis.sql** - Spatial extension + geometry column
3. **003_create_routes_table.sql** - Routes with metadata
4. **004_create_route_stops_table.sql** - Stop sequences with cascade deletes

**Cascades**:
- Delete user → Delete all clients/routes
- Delete route → Delete all route_stops
- Delete client → Set `route_stops.client_id` to NULL (preserve historical stops)
