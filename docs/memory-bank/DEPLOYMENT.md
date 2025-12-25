---
name: deployment
description: Infrastructure and deployment documentation
argument-hint: N/A
---

# Deployment

## CI/CD Pipeline

### <ci_flow>

- **No CI/CD configured**: Manual deployments via Vercel CLI or Git push

- **Deployment Triggers**:
  - Manual deployments: Push to production branch or via Vercel CLI
  - Automated deployments: Not configured (no GitHub Actions workflows)

## Monitoring & Logging

- **Monitoring Tools**: Not configured

- **Logging**: Vercel runtime logs available via Vercel dashboard

- **Alert Configuration**: Not configured

## Deployment Process

- **Deployment Steps**:

  1. Database migrations: Manual via Supabase SQL Editor
     - Run migrations in order from @supabase/migrations/
     - Enable PostGIS extension manually
  2. Environment variables: Configure in Vercel dashboard
  3. Deploy: Push to main branch or use `vercel --prod`

- **Rollback Procedure**:

  1. Use Vercel dashboard to redeploy previous deployment
  2. Verify rollback success via production URL
  3. Check Supabase logs for database issues

# Infrastructure

## Project Structure

```plaintext
RouteMax/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── clients/          # Client management APIs
│   │   ├── routes/           # Route planning APIs
│   │   └── geocode/          # Geocoding utility API
│   ├── dashboard/            # Dashboard pages
│   └── page.tsx              # Landing page
├── components/               # React components
├── lib/                      # Utilities
│   ├── supabase/             # Supabase clients
│   └── types/                # TypeScript types
├── supabase/                 # Database migrations
│   └── migrations/           # SQL migration files
└── public/                   # Static assets
```

## Environments Variables

### Environment Files

- `.env.example`: Template for required environment variables
- `.env.local`: Local development (gitignored)
- Vercel: Production environment variables via dashboard

### Required Environment Variables

#### Supabase (Database & Auth)

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key for client-side auth

#### Google Cloud Platform (Maps & Optimization)

- `GOOGLE_CLOUD_PROJECT_ID`: GCP project identifier
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Client-side Maps JavaScript API key
- `GOOGLE_MAPS_API_KEY_SERVER`: Server-side API key for Routes Optimization, Places, Geocoding, Distance Matrix

#### Application

- `NEXT_PUBLIC_APP_URL`: Application base URL (http://localhost:3000 for dev)

## URLs

- **Development**:

  - URL: http://localhost:3000
  - Purpose: Local development
  - Start: `npm run dev`

- **Production**:
  - URL: Not specified (deployed via Vercel)
  - Platform: Vercel
  - SLA: Vercel platform SLA

## Containerization

No containerization configured. Next.js 15 app deployed via Vercel serverless platform.
