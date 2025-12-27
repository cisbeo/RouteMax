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
- `opening_time` TIME - Client opening hours (default: 09:00:00)
- `closing_time` TIME - Client closing hours (default: 17:00:00)
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

### Spatial RPC Functions

#### `suggest_clients_along_route`

Suggests clients within a corridor along a straight line (start → end).

```sql
SELECT * FROM suggest_clients_along_route(
  p_user_id := 'uuid',
  p_start_lng := 2.35,
  p_start_lat := 48.85,
  p_end_lng := 4.83,
  p_end_lat := 45.76,
  p_corridor_radius_m := 10000,
  p_max_results := 30
);
```

**Returns**: `id, name, address, lat, lng, is_active, created_at, distance_meters, score`

#### `suggest_clients_along_polyline`

Suggests clients within a corridor along a multi-point polyline. Used for loop routes where start === end.

```sql
SELECT * FROM suggest_clients_along_polyline(
  p_user_id := 'uuid',
  p_points_json := '[{"lat":48.85,"lng":2.35},{"lat":48.90,"lng":2.40},{"lat":48.85,"lng":2.35}]'::jsonb,
  p_corridor_radius_m := 10000,
  p_max_results := 30
);
```

**Returns**: `id, name, address, lat, lng, is_active, created_at, distance_meters, score`

**Use case**: Loop routes where commercial starts and ends at home. Builds a LineString through all waypoints and searches within corridor of the entire route.

#### `suggest_clients_in_bbox`

Suggests clients within a bounding box. Legacy function, replaced by polyline for loop routes.

```sql
SELECT * FROM suggest_clients_in_bbox(
  p_user_id := 'uuid',
  p_min_lng := 2.30,
  p_min_lat := 48.80,
  p_max_lng := 2.40,
  p_max_lat := 48.90,
  p_max_results := 30
);
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

-- Get clients with opening hours for route planning
SELECT id, name, address, lat, lng, opening_time, closing_time
FROM clients
WHERE user_id = auth.uid() AND is_active = true;
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

## Business Rules

### Opening Hours Constraint

**Migration**: `009_add_opening_hours.sql`

Clients have configurable opening hours that constrain visit scheduling:

- **Default Hours**: 09:00:00 - 17:00:00 (9 AM - 5 PM)
- **Format**: TIME type (HH:MM:SS)
- **Enforcement**: Application-level validation during route optimization
- **Behavior**: Clients visited outside hours marked as `isIncluded: false` in route_stops

**Validation Logic**:

```typescript
// Visit time checked against client opening/closing hours
const visitHour = visitDate.getHours();
const visitMinutes = visitDate.getMinutes();
const visitTimeInMinutes = visitHour * 60 + visitMinutes;

// Parse client hours (e.g., "09:00:00" → 540 minutes)
const openingMinutes = parseTimeToMinutes(client.opening_time);
const closingMinutes = parseTimeToMinutes(client.closing_time);

// Client excluded if visit outside hours
if (visitTimeInMinutes < openingMinutes || visitTimeInMinutes > closingMinutes) {
  stop.isIncluded = false; // Excluded from visit count
}
```

**Database Columns**:
```sql
ALTER TABLE clients
  ADD COLUMN opening_time TIME DEFAULT '09:00:00',
  ADD COLUMN closing_time TIME DEFAULT '17:00:00';

COMMENT ON COLUMN clients.opening_time IS 'Client opening time (format HH:MM:SS). Visits must be scheduled after this time.';
COMMENT ON COLUMN clients.closing_time IS 'Client closing time (format HH:MM:SS). Visits must be scheduled before this time.';
```

**Impact on Routes**:

- Excluded clients appear in timeline but don't count as visits
- `prospectsExcluded` and `clientsOutsideOpeningHours` returned in API response
- Frontend shows warning toast with excluded client names
- Route statistics only count `isIncluded: true` stops

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
5. **006_add_route_advanced_settings.sql** - Lunch breaks and vehicle type
6. **007_verify_advanced_settings.sql** - Verification queries
7. **008_add_optimization_method.sql** - Optimization method column
8. **009_add_opening_hours.sql** - Client opening/closing hours
9. **009_add_suggest_clients_rpc.sql** - `suggest_clients_along_route` function
10. **010_suggest_clients_bbox.sql** - `suggest_clients_in_bbox` function
11. **011_suggest_clients_along_polyline.sql** - `suggest_clients_along_polyline` function (loop routes)

**Cascades**:
- Delete user → Delete all clients/routes
- Delete route → Delete all route_stops
- Delete client → Set `route_stops.client_id` to NULL (preserve historical stops)
