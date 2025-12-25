---
name: codebase-structure
description: Project structure documentation
argument-hint: N/A
---

# Codebase Structure

## Overview

RouteMax is a Next.js 15 application using the App Router, TypeScript, and Tailwind CSS. The codebase follows Next.js conventions with clear separation between API routes, UI pages, components, and utilities.

## Directory Tree

```
RouteMax/
├── @app/                         Next.js App Router (pages & API)
│   ├── @app/api/                 API routes (server-side) - 8 endpoints
│   │   ├── @app/api/auth/        Authentication
│   │   │   └── logout/           POST logout endpoint
│   │   ├── @app/api/clients/     Client management CRUD
│   │   │   ├── [id]/            GET/PUT/DELETE specific client
│   │   │   ├── import/          POST CSV import with geocoding
│   │   │   └── route.ts         GET list clients, POST create client
│   │   └── @app/api/routes/      Route planning & optimization
│   │       ├── [id]/            GET/DELETE specific route
│   │       ├── optimize/        POST create optimized route
│   │       ├── suggest/         POST get client suggestions
│   │       └── user/            GET user's routes
│   ├── @app/auth/               Auth pages
│   │   ├── callback/           OAuth callback handler
│   │   ├── error/              Auth error page
│   │   └── login/              Login page
│   ├── @app/dashboard/          Protected dashboard pages
│   │   ├── @app/dashboard/clients/  Client management UI (224 lines)
│   │   │   ├── [id]/edit/      Edit client form
│   │   │   ├── import/         CSV import interface
│   │   │   └── page.tsx        Client list & management
│   │   ├── @app/dashboard/routes/   Route planning UI (450 lines)
│   │   │   ├── [id]/           Route detail page
│   │   │   ├── new/            New route form
│   │   │   └── page.tsx        Route list with filters/sort
│   │   └── layout.tsx          Dashboard layout
│   ├── @app/globals.css         Global styles
│   ├── @app/layout.tsx          Root layout with metadata
│   ├── @app/metadata.ts         SEO metadata config
│   ├── @app/page.tsx            Landing page
│   ├── @app/sitemap.ts          Sitemap generation
│   └── @app/test-env/           Environment variables test page
│
├── @components/                 React components (6 files)
│   ├── @components/layout/      Layout components
│   │   ├── Footer.tsx          Site footer
│   │   └── Navigation.tsx      Top navigation bar
│   └── @components/routes/      Route-specific components
│       ├── RouteActions.tsx    Route action buttons (141 lines)
│       ├── RouteForm.tsx       Route creation form (558 lines)
│       ├── RouteMap.tsx        Google Maps integration (287 lines)
│       └── RouteTimeline.tsx   Route timeline display (206 lines)
│
├── @lib/                        Utilities & core logic
│   ├── @lib/supabase/           Supabase client configs
│   │   ├── @lib/supabase/client.ts      Browser client
│   │   ├── @lib/supabase/middleware.ts  Auth middleware
│   │   └── @lib/supabase/server.ts      Server client
│   ├── @lib/types/              TypeScript type definitions
│   │   ├── @lib/types/database.ts  Supabase schema types
│   │   └── @lib/types/index.ts     Domain types (Client, Route, etc.)
│   └── @lib/utils/              Helper functions
│       ├── geocode.ts          Geocoding utilities
│       ├── retry.ts            Retry logic for API calls
│       └── validation.ts       Zod validation schemas
│
├── @supabase/                   Database configuration
│   ├── @supabase/migrations/    SQL migration files (7 files)
│   │   ├── 001_create_clients_table.sql
│   │   ├── 002_enable_postgis.sql
│   │   ├── 003_create_routes_table.sql
│   │   ├── 004_create_route_stops_table.sql
│   │   ├── 006_add_route_advanced_settings.sql
│   │   ├── 007_verify_advanced_settings.sql (not committed)
│   │   └── 008_add_optimization_method.sql
│   └── @supabase/README.md      Database setup guide
│
├── @public/                     Static assets
├── @middleware.ts               Next.js middleware (Supabase auth)
├── @next.config.ts              Next.js configuration
├── @tailwind.config.ts          Tailwind CSS config
└── @package.json                Dependencies & scripts
```

## Directory Purpose

### @app/
Main application directory using Next.js App Router pattern.

**@app/api/** - 8 fully implemented API endpoints:

- **auth/logout** - POST endpoint for user logout
- **clients/** - Full CRUD: GET list, POST create, GET/PUT/DELETE by ID
- **clients/import/** - POST CSV import with automatic geocoding
- **routes/** - GET user routes, POST suggestions, POST optimize, GET/DELETE by ID

**@app/auth/** - Authentication flow pages:

- **login/** - Magic link login page
- **callback/** - OAuth callback handler
- **error/** - Auth error handling page

**@app/dashboard/** - Protected application pages:

- **clients/** - Client management (224 lines): list, filter, import, edit
- **routes/** - Route planning (450 lines): list, create, view, optimize with advanced filters

**@app/layout.tsx** - Root layout with metadata, fonts, and global structure.

**@app/page.tsx** - Public landing page.

**@app/metadata.ts** - Centralized SEO metadata configuration.

**@app/sitemap.ts** - Dynamic sitemap generation.

### @components/
Production-ready React components.

**@components/layout/** - Site-wide layout:

- **Navigation.tsx** - Responsive top navigation with auth state
- **Footer.tsx** - Site footer with links

**@components/routes/** - Route feature components (1,192 total lines):

- **RouteForm.tsx** (558 lines) - Complex form with date/time, vehicle type, lunch breaks
- **RouteMap.tsx** (287 lines) - Google Maps integration with markers and polylines
- **RouteTimeline.tsx** (206 lines) - Visual timeline of route stops
- **RouteActions.tsx** (141 lines) - Export, share, delete actions

### @lib/
Core utilities and shared logic.

**@lib/supabase/** - Supabase client initialization for different environments (browser, server, middleware).

**@lib/types/** - TypeScript types:

- `database.ts` - Supabase-generated schema types
- `index.ts` - Domain models (Client, Route, RouteStop, etc.)

**@lib/utils/** - Helper functions:

- `geocode.ts` - Google Geocoding API wrapper
- `retry.ts` - Retry logic for external API calls
- `validation.ts` - Zod schemas for request validation

### @supabase/
Database schema and migrations.

**@supabase/migrations/** - SQL files for database setup (clients table, PostGIS, routes, route_stops).

### Root Configuration
**@middleware.ts** - Supabase authentication middleware, runs on all routes except static assets.

**@next.config.ts** - Next.js configuration (minimal, default settings).

**@tailwind.config.ts** - Tailwind CSS customization.

**@package.json** - Dependencies: Next.js 15, React 19, Supabase, Google Maps, TypeScript.

## Organization Patterns

### Feature-Based Structure
API routes and components organized by feature (clients, routes) for easy navigation and maintenance.

### Type Safety
Centralized type definitions in @lib/types/ shared across frontend and backend. Database schema types auto-generated from Supabase.

### Client Separation
Supabase clients split by environment (browser/server/middleware) to avoid hydration issues and ensure proper authentication context.

### Implementation Status

**Fully Implemented** (23 TypeScript files in app/, 6 in components/):

- Complete API backend with 8 endpoints
- Full authentication flow (login, callback, logout)
- Client management UI with CSV import
- Route planning UI with Google Maps integration
- Advanced features: lunch breaks, vehicle types, filters, sorting

## Tech Stack

**Framework:** Next.js 15 (App Router)
**Language:** TypeScript (strict mode)
**Styling:** Tailwind CSS 4
**Database:** Supabase (PostgreSQL + PostGIS)
**Maps:** Google Maps APIs (Maps JS, Places, Geocoding, Routes)
**State:** React 19 (no global state library)
**Validation:** Zod
