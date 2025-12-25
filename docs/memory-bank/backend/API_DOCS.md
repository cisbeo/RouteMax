# RouteMax API Documentation

## Overview

RouteMax API provides endpoints for client management, route planning, and optimization. All endpoints require authentication via Supabase Auth.

**Base URL**: `/api`
**Auth**: Supabase session cookie (handled by middleware)
**Content-Type**: `application/json`

---

## Authentication

All API routes protected by @middleware.ts using Supabase Auth.

**Authentication Flow**:
1. User authenticates via Supabase Magic Link
2. Session stored in cookie
3. Middleware validates session on every request
4. `user_id` extracted from `auth.uid()`

**Unauthenticated Response**:
```json
{
  "error": "Unauthorized"
}
```
Status: `401`

---

## Client Management

### Import Clients

**Endpoint**: `POST /api/clients/import`

Import clients from CSV with automatic geocoding.

**Request Body**:
```typescript
{
  clients: Array<{
    name: string;
    address: string;
  }>
}
```

**Response** (200):
```typescript
{
  imported: number;
  failed: Array<{
    name: string;
    address: string;
    error: string;
  }>;
  clients: Client[];
}
```

**Client Type**:
```typescript
{
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  is_active: boolean;
  created_at: string;
}
```

**Error Responses**:
- `400`: Invalid request body or schema validation failed
- `401`: User not authenticated
- `500`: Geocoding or database error

**Example**:
```bash
curl -X POST https://routemax.app/api/clients/import \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{
    "clients": [
      {"name": "Acme Corp", "address": "123 Main St, Paris"},
      {"name": "TechStart", "address": "456 Tech Blvd, Lyon"}
    ]
  }'
```

---

### List Clients

**Endpoint**: `GET /api/clients`

Retrieve user's clients with pagination.

**Query Parameters**:
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Items per page
- `active_only` (optional, default: false): Filter active clients

**Response** (200):
```typescript
{
  clients: Client[];
  total: number;
  page: number;
  limit: number;
}
```

**Example**:
```bash
curl https://routemax.app/api/clients?page=1&limit=20&active_only=true \
  -H "Cookie: sb-access-token=..."
```

---

### Update Client

**Endpoint**: `PUT /api/clients/[id]`

Update client information. Re-geocodes if address changed.

**Path Parameters**:
- `id`: Client UUID

**Request Body**:
```typescript
{
  name?: string;
  address?: string;
  is_active?: boolean;
}
```

**Response** (200):
```typescript
{
  client: Client;
}
```

**Error Responses**:
- `400`: Invalid input or validation failed
- `401`: Unauthorized
- `404`: Client not found or doesn't belong to user
- `500`: Geocoding or database error

**Example**:
```bash
curl -X PUT https://routemax.app/api/clients/123e4567-e89b-12d3 \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"name": "Acme Corp Updated", "is_active": true}'
```

---

### Delete Client

**Endpoint**: `DELETE /api/clients/[id]`

Soft-delete client (sets `is_active = false`).

**Path Parameters**:
- `id`: Client UUID

**Response** (200):
```typescript
{
  success: true;
}
```

**Error Responses**:
- `401`: Unauthorized
- `404`: Client not found
- `500`: Database error

**Example**:
```bash
curl -X DELETE https://routemax.app/api/clients/123e4567-e89b-12d3 \
  -H "Cookie: sb-access-token=..."
```

---

## Route Planning

### Suggest Clients

**Endpoint**: `POST /api/routes/suggest`

Get client suggestions based on route corridor using PostGIS spatial queries.

**Request Body**:
```typescript
{
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  corridorRadiusKm: number; // default: 5
  maxSuggestions: number;   // default: 20
}
```

**Response** (200):
```typescript
{
  suggestions: SuggestedClient[];
}
```

**SuggestedClient Type**:
```typescript
{
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  is_active: boolean;
  created_at: string;
  distanceFromRouteLine: number; // meters
  score: number; // 0-100, proximity-based
}
```

**Algorithm**:
1. Create LineString from start → end
2. Query clients within corridor radius using `ST_DWithin`
3. Calculate distance from route line with `ST_Distance`
4. Score based on proximity (closer = higher score)
5. Return top N suggestions ordered by score

**Error Responses**:
- `400`: Invalid coordinates or parameters
- `401`: Unauthorized
- `500`: PostGIS query error

**Example**:
```bash
curl -X POST https://routemax.app/api/routes/suggest \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{
    "startLat": 48.8566,
    "startLng": 2.3522,
    "endLat": 45.764,
    "endLng": 4.8357,
    "corridorRadiusKm": 10,
    "maxSuggestions": 15
  }'
```

---

### Create Optimized Route

**Endpoint**: `POST /api/routes/optimize`

Generate optimized route using Google Routes API.

**Request Body**:
```typescript
{
  name: string;
  startAddress: string;
  startLat: number;
  startLng: number;
  startDatetime: string; // ISO 8601
  endAddress: string;
  endLat: number;
  endLng: number;
  endDatetime: string;   // ISO 8601
  clientIds: string[];   // UUIDs of clients to visit
  visitDurationMinutes?: number; // default: 20
}
```

**Response** (200):
```typescript
{
  route: Route;
  stops: RouteStop[];
}
```

**Route Type**:
```typescript
{
  id: string;
  name: string;
  startAddress: string;
  startLat: number;
  startLng: number;
  startDatetime: string;
  endAddress: string;
  endLat: number;
  endLng: number;
  endDatetime: string;
  totalDistanceKm: number | null;
  totalDurationMinutes: number | null;
  totalVisits: number;
  createdAt: string;
}
```

**RouteStop Type**:
```typescript
{
  id: string;
  clientId: string | null;
  clientName: string | null;
  address: string;
  lat: number;
  lng: number;
  stopOrder: number;
  estimatedArrival: string | null;
  estimatedDeparture: string | null;
  durationFromPrevious: number; // minutes
  distanceFromPrevious: number; // km
  visitDuration: number;        // minutes
  isIncluded: boolean;
}
```

**Process**:
1. Validate client IDs belong to user
2. Call Google Routes Optimization API
3. Insert route record
4. Insert route_stops with sequences
5. Return optimized route data

**Error Responses**:
- `400`: Invalid input, time window exceeded, or too many stops
- `401`: Unauthorized
- `403`: Client access denied
- `500`: Google API error or database error

**Example**:
```bash
curl -X POST https://routemax.app/api/routes/optimize \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{
    "name": "Monday Route",
    "startAddress": "10 Rue de Rivoli, Paris",
    "startLat": 48.8566,
    "startLng": 2.3522,
    "startDatetime": "2025-12-26T08:00:00Z",
    "endAddress": "20 Avenue des Champs-Élysées, Paris",
    "endLat": 48.8698,
    "endLng": 2.3078,
    "endDatetime": "2025-12-26T18:00:00Z",
    "clientIds": ["uuid1", "uuid2", "uuid3"],
    "visitDurationMinutes": 30
  }'
```

---

### Get Route Details

**Endpoint**: `GET /api/routes/[id]`

Retrieve route with all stops.

**Path Parameters**:
- `id`: Route UUID

**Response** (200):
```typescript
{
  route: Route;
  stops: RouteStop[];
}
```

**Error Responses**:
- `401`: Unauthorized
- `404`: Route not found
- `500`: Database error

**Example**:
```bash
curl https://routemax.app/api/routes/123e4567-e89b-12d3 \
  -H "Cookie: sb-access-token=..."
```

---

### List User Routes

**Endpoint**: `GET /api/routes/user`

Retrieve user's route history.

**Query Parameters**:
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response** (200):
```typescript
{
  routes: Route[];
  total: number;
  page: number;
  limit: number;
}
```

**Example**:
```bash
curl https://routemax.app/api/routes/user?page=1&limit=10 \
  -H "Cookie: sb-access-token=..."
```

---

### Delete Route

**Endpoint**: `DELETE /api/routes/[id]`

Delete route and cascade-delete all stops.

**Path Parameters**:
- `id`: Route UUID

**Response** (200):
```typescript
{
  success: true;
}
```

**Error Responses**:
- `401`: Unauthorized
- `404`: Route not found
- `500`: Database error

**Example**:
```bash
curl -X DELETE https://routemax.app/api/routes/123e4567-e89b-12d3 \
  -H "Cookie: sb-access-token=..."
```

---

## Utilities

### Geocode Address

**Endpoint**: `POST /api/geocode`

Geocode single address using Google Geocoding API.

**Request Body**:
```typescript
{
  address: string;
}
```

**Response** (200):
```typescript
{
  address: string;          // original
  lat: number;
  lng: number;
  formattedAddress: string; // Google-formatted
}
```

**Error Responses**:
- `400`: Invalid or empty address
- `500`: Google API error
- `404`: Address not found

**Example**:
```bash
curl -X POST https://routemax.app/api/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "10 Rue de Rivoli, Paris"}'
```

**Note**: This endpoint does NOT require authentication (used in public forms).

---

## Error Handling

All errors follow consistent format:

```typescript
{
  error: string;        // Human-readable message
  code?: string;        // Optional error code
  details?: unknown;    // Optional additional context
}
```

**HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (validation failed)
- `401`: Unauthorized (missing/invalid auth)
- `403`: Forbidden (authorized but not allowed)
- `404`: Not Found
- `500`: Internal Server Error

**Common Error Patterns**:
```typescript
// Validation error
{
  error: "Invalid request body",
  code: "VALIDATION_ERROR",
  details: { field: "startLat", message: "Must be a number" }
}

// Database error
{
  error: "Failed to fetch clients",
  code: "DATABASE_ERROR"
}

// External API error
{
  error: "Geocoding failed",
  code: "GOOGLE_API_ERROR",
  details: { status: "ZERO_RESULTS" }
}
```

---

## Rate Limits

**Not implemented in MVP**. Future considerations:
- Google API quota limits apply
- Supabase connection pooling limits apply
- No explicit rate limiting per user

---

## Validation

All endpoints use Zod for schema validation.

**Client Import Schema**:
```typescript
const importSchema = z.object({
  clients: z.array(
    z.object({
      name: z.string().min(1).max(255),
      address: z.string().min(1).max(500)
    })
  ).min(1).max(100)
});
```

**Route Creation Schema**:
```typescript
const routeSchema = z.object({
  name: z.string().min(1).max(255),
  startAddress: z.string().min(1),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  startDatetime: z.string().datetime(),
  endAddress: z.string().min(1),
  endLat: z.number().min(-90).max(90),
  endLng: z.number().min(-180).max(180),
  endDatetime: z.string().datetime(),
  clientIds: z.array(z.string().uuid()).min(1).max(25),
  visitDurationMinutes: z.number().min(5).max(120).optional()
});
```

---

## Database Operations

All API routes use @lib/supabase/server.ts client with RLS enforcement.

**Access Pattern**:
```typescript
const supabase = createClient();
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', user.id); // RLS auto-filters
```

**RLS Guarantees**:
- Users can only access their own data
- No cross-user data leakage
- Enforced at database level

---

## Google APIs Integration

### Geocoding API
- **Endpoint**: `POST /api/geocode`
- **Usage**: Address → Coordinates
- **Quota**: Unlimited (pay-per-use)
- **Cost**: $5 per 1,000 requests

### Routes Optimization API
- **Endpoint**: `POST /api/routes/optimize`
- **Usage**: Optimized route sequences
- **Quota**: Unlimited (pay-per-use)
- **Cost**: $10 per 1,000 optimizations
- **Limit**: 25 waypoints per route

**API Key**: `GOOGLE_MAPS_API_KEY_SERVER` (server-side only)

---

## Implementation Status

**Current State**: ✅ ALL API routes fully implemented and production-ready.

**Implemented Endpoints** (8 total):

1. ✅ `POST /api/auth/logout` - User logout
2. ✅ `POST /api/clients/import` - CSV import with geocoding
3. ✅ `GET /api/clients` - Client list with pagination
4. ✅ `POST /api/clients` - Create new client
5. ✅ `GET/PUT/DELETE /api/clients/[id]` - Client CRUD operations
6. ✅ `POST /api/routes/suggest` - Spatial client suggestions
7. ✅ `POST /api/routes/optimize` - Route creation with Google Routes API
8. ✅ `GET /api/routes/user` - User's route list
9. ✅ `GET/DELETE /api/routes/[id]` - Route details and deletion

**Additional Features**:

- Geocoding via `@lib/utils/geocode.ts`
- Retry logic via `@lib/utils/retry.ts`
- Request validation via `@lib/utils/validation.ts`
- Advanced route settings: lunch breaks, vehicle types

**Testing**: See @docs/memory-bank/backend/TESTING.md

---

## Related Documentation

- Database Schema: @docs/memory-bank/backend/DATABASE.md
- Type Definitions: @lib/types/index.ts, @lib/types/database.ts
- Project Structure: @docs/memory-bank/CODEBASE_STRUCTURE.md
- Supabase Config: @lib/supabase/
