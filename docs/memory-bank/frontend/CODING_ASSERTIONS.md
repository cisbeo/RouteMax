# Frontend Coding Assertions

## Stack
- Next.js 15.1.5 (App Router)
- React 19.0.0
- TypeScript 5 (strict mode)
- Tailwind CSS 4.0.0
- Supabase (SSR)

## Naming Conventions

### Files & Directories
- Route files: lowercase `page.tsx`, `layout.tsx`
- Components: empty directories exist (`components/ui`, `components/clients`, `components/routes`)
- Config files: lowercase with extension `next.config.ts`, `tailwind.config.ts`
- Middleware: `middleware.ts` at root
- API routes: nested under `app/api/*`

### TypeScript
- Interfaces: PascalCase `Database`, `Client`, `Route`, `RouteStop`
- Types: exported via `export type { Database }`
- Functions: camelCase `createClient()`, `updateSession()`
- Database fields: snake_case `user_id`, `created_at`, `is_active`
- Application fields: camelCase `startAddress`, `totalDistanceKm`, `clientName`

## File Organization

### Structure
```
/app
  /layout.tsx          # Root layout
  /page.tsx            # Home page
  /dashboard/*         # Dashboard routes (empty)
  /api/*               # API routes (empty)
/lib
  /types
    /database.ts       # Supabase types
    /index.ts          # App types + re-exports
  /supabase
    /client.ts         # Browser client
    /server.ts         # Server client
    /middleware.ts     # Auth middleware
/components
  /ui                  # UI components (empty)
  /clients             # Client components (empty)
  /routes              # Route components (empty)
```

## TypeScript Patterns

### Type Definitions
- Database types: nested `Database.public.Tables.{table}.Row/Insert/Update`
- Strict mode enabled
- Path alias: `@/*` maps to root
- Target: ES2017
- Non-null assertions: `process.env.NEXT_PUBLIC_SUPABASE_URL!`

### Database Schema Mapping
- `Row`: read operations
- `Insert`: create operations (optional fields with `?`)
- `Update`: update operations (all optional with `?`)
- Metadata fields: `Record<string, unknown> | null`

## React Patterns

### Components
- Server components by default
- Readonly props: `Readonly<{ children: React.ReactNode }>`
- Function declarations: `export default function ComponentName()`
- No props destructuring in examples
- Metadata exported separately: `export const metadata: Metadata`

### Styling
- Tailwind utility classes
- CSS variables for theming (`--background`, `--foreground`)
- Dark mode via `prefers-color-scheme`
- className prop for styling

## Supabase Patterns

### Client Creation
- Browser: `createBrowserClient<Database>(url, key)`
- Server: `createServerClient<Database>()` with async cookies
- Middleware: inline client creation with cookie handlers
- Always typed with `Database` generic

### Cookie Handling
- Server: `await cookies()` then `getAll()`/`setAll()`
- Middleware: `request.cookies` and `response.cookies`
- Try-catch for `setAll()` in server components

## Import Patterns
- Type imports: `import type { Metadata } from "next"`
- Named exports: `export { Database } from './database'`
- Type re-exports: `export type { Database }`
- Path alias: `@/lib/types/database`
- No default + named imports mixing

## Configuration

### Next.js
- Minimal config (empty `nextConfig`)
- Middleware matcher excludes: `_next/static`, `_next/image`, `favicon.ico`, static assets

### Tailwind
- Content paths: `./pages/**`, `./components/**`, `./app/**`
- Theme extension for CSS variables
- No plugins
- Uses `satisfies Config`

### TypeScript
- `strict: true`
- `moduleResolution: "bundler"`
- `jsx: "preserve"`
- `skipLibCheck: true`
- No emitting

## Dependencies
- `@supabase/ssr` for SSR
- `@supabase/supabase-js` for client
- `@googlemaps/google-maps-services-js` for geocoding
- `@react-google-maps/api` for maps
- `date-fns` for dates
- `papaparse` for CSV
- `zod` for validation
- `sonner` for toasts
