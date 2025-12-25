# RouteMax Database Setup

This directory contains SQL migrations for setting up the RouteMax database schema in Supabase.

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and anon key to `.env.local`

## Running Migrations

### Option 1: Using Supabase Dashboard (Recommended for MVP)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Execute each migration file in order:
   - `001_create_clients_table.sql`
   - `002_enable_postgis.sql` ⚠️ **Requires manual PostGIS enablement**
   - `003_create_routes_table.sql`
   - `004_create_route_stops_table.sql`

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## ⚠️ IMPORTANT: PostGIS Manual Configuration

**PostGIS extension requires manual enablement in Supabase.**

### Steps to Enable PostGIS:

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Extensions**
3. Search for "postgis"
4. Click **Enable** on the PostGIS extension
5. Wait for the extension to activate (~30 seconds)
6. Then run migration `002_enable_postgis.sql`

**Why manual?**
- PostGIS requires superuser privileges
- Supabase restricts `CREATE EXTENSION` in SQL editor for security
- Must be enabled through dashboard UI

### Verify PostGIS Installation

Run this query in SQL Editor to confirm PostGIS is working:

```sql
SELECT PostGIS_Version();
```

You should see a version number like `3.4.0`.

### Test Spatial Queries

After running all migrations, test the spatial setup:

```sql
-- Insert test client
INSERT INTO clients (user_id, name, address, lat, lng)
VALUES (
  auth.uid(),
  'Test Client',
  '15 Rue de la Paix, 75002 Paris',
  48.869352,
  2.331717
);

-- Verify geometry was created
SELECT id, name, ST_AsText(geom) as geometry
FROM clients
LIMIT 1;
```

Expected output: `POINT(2.331717 48.869352)`

## Database Schema Overview

### Tables

1. **clients**
   - User's client database
   - Geocoded addresses with lat/lng
   - PostGIS geometry for spatial queries
   - RLS enabled (users see only their clients)

2. **routes**
   - Saved route configurations
   - Start/end points with timestamps
   - Optimization results and metadata
   - RLS enabled

3. **route_stops**
   - Ordered stops for each route
   - Links to clients (optional)
   - Travel times and distances
   - RLS enabled (inherited from routes)

### Key Features

- **Row Level Security (RLS)**: All tables protected by user-level policies
- **PostGIS Spatial Indexing**: Fast corridor searches using GIST indexes
- **Auto-updating timestamps**: `updated_at` triggers on relevant tables
- **Cascade Deletes**: Deleting a route removes all its stops

## Common Issues

### Issue: "extension postgis does not exist"
**Solution:** Enable PostGIS in Dashboard → Database → Extensions first

### Issue: "permission denied to create extension"
**Solution:** Use Dashboard UI to enable PostGIS, not SQL CREATE EXTENSION

### Issue: RLS blocking inserts
**Solution:** Ensure user is authenticated and `auth.uid()` returns valid UUID

## Environment Variables

Make sure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing the Setup

1. Enable PostGIS in dashboard
2. Run all 4 migrations in order
3. Test with sample data:

```sql
-- This should work if everything is set up correctly
SELECT
  c.id,
  c.name,
  ST_Distance(
    c.geom::geography,
    ST_SetSRID(ST_MakePoint(2.294481, 48.858370), 4326)::geography
  ) / 1000 AS distance_km
FROM clients c
WHERE c.user_id = auth.uid()
  AND c.is_active = true
ORDER BY distance_km ASC
LIMIT 10;
```

## Next Steps

After database setup:
1. Configure Google Cloud APIs
2. Set up authentication flows
3. Implement client import API
4. Test route optimization

## Support

- Supabase Docs: https://supabase.com/docs
- PostGIS Manual: https://postgis.net/docs/
- RouteMax Spec: See AGENTS.md
