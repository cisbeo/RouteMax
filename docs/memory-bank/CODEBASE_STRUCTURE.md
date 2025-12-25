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
│   ├── @app/api/                 API routes (server-side)
│   │   ├── @app/api/clients/     Client management endpoints
│   │   ├── @app/api/geocode/     Address geocoding utility
│   │   └── @app/api/routes/      Route planning & optimization
│   ├── @app/dashboard/           Protected dashboard pages
│   │   ├── @app/dashboard/clients/   Client management UI
│   │   └── @app/dashboard/routes/    Route planning UI
│   ├── @app/globals.css          Global styles
│   ├── @app/layout.tsx           Root layout with metadata
│   └── @app/page.tsx             Landing page
│
├── @components/                  React components
│   ├── @components/clients/      Client-related components
│   ├── @components/routes/       Route-related components
│   └── @components/ui/           Shared UI components
│
├── @lib/                         Utilities & core logic
│   ├── @lib/supabase/            Supabase client configs
│   │   ├── @lib/supabase/client.ts      Browser client
│   │   ├── @lib/supabase/middleware.ts  Auth middleware
│   │   └── @lib/supabase/server.ts      Server client
│   ├── @lib/types/               TypeScript type definitions
│   │   ├── @lib/types/database.ts  Supabase schema types
│   │   └── @lib/types/index.ts     Domain types (Client, Route, etc.)
│   └── @lib/utils/               Helper functions (empty)
│
├── @supabase/                    Database configuration
│   ├── @supabase/migrations/     SQL migration files (4 files)
│   └── @supabase/README.md       Database setup guide
│
├── @public/                      Static assets (empty)
├── @middleware.ts                Next.js middleware (Supabase auth)
├── @next.config.ts               Next.js configuration
├── @tailwind.config.ts           Tailwind CSS config
└── @package.json                 Dependencies & scripts
```

## Directory Purpose

### @app/
Main application directory using Next.js App Router pattern.

**@app/api/** - Server-side API endpoints organized by feature (clients, routes, geocode). Each subdirectory maps to an API route.

**@app/dashboard/** - Protected pages for authenticated users. Contains client management and route planning interfaces.

**@app/layout.tsx** - Root layout defining HTML structure, metadata, and global styles.

**@app/page.tsx** - Public landing page (currently minimal).

### @components/
React components organized by feature domain.

**@components/clients/** - Components for client list, import, and management.

**@components/routes/** - Components for route configuration, map display, and optimization.

**@components/ui/** - Reusable UI components (buttons, inputs, modals).

### @lib/
Core utilities and shared logic.

**@lib/supabase/** - Supabase client initialization for different environments (browser, server, middleware).

**@lib/types/** - Centralized TypeScript types. `database.ts` contains Supabase-generated schema types, `index.ts` has domain models.

**@lib/utils/** - Helper functions (currently empty, placeholder for future utilities).

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

### Empty Directories
Several directories (@app/api/clients/, @components/ui/, @lib/utils/, @public/) are currently empty, indicating planned but not yet implemented features.

## Tech Stack

**Framework:** Next.js 15 (App Router)
**Language:** TypeScript (strict mode)
**Styling:** Tailwind CSS 4
**Database:** Supabase (PostgreSQL + PostGIS)
**Maps:** Google Maps APIs (Maps JS, Places, Geocoding, Routes)
**State:** React 19 (no global state library)
**Validation:** Zod
