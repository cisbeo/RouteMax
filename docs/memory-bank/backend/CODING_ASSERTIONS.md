# Backend Coding Assertions

## API Route Patterns

### Route Handler Structure
- Next.js 15 App Router API routes: `/app/api/[feature]/route.ts`
- Named exports: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Function signature: `async function GET(request: NextRequest)`
- Return type: `NextResponse` or `Response`

### Response Conventions
- Success: `NextResponse.json({ data }, { status: 200 })`
- Created: `NextResponse.json({ data }, { status: 201 })`
- Error: `NextResponse.json({ error: string }, { status: 4xx/5xx })`
- Always return JSON, never plain text

## TypeScript Usage

### Strict Mode Enabled
- `tsconfig.json` has `"strict": true`
- All function parameters must have explicit types
- No implicit `any` types allowed
- Use `!` assertion only for verified env vars: `process.env.VAR!`

### Type Imports
- Database types: `import { Database } from '@/lib/types/database'`
- Domain types: `import { Client, Route, RouteStop } from '@/lib/types'`
- Supabase client type: `createServerClient<Database>(...)`
- Next types: `import { type NextRequest } from 'next/server'`

### Database Type Patterns
- Table Row: `Database['public']['Tables']['clients']['Row']`
- Insert: `Database['public']['Tables']['clients']['Insert']`
- Update: `Database['public']['Tables']['clients']['Update']`
- Use domain types for frontend, database types for backend

## Error Handling

### Server-Side Errors
- Wrap async operations in try-catch blocks
- Silent catch only for Server Components: `catch { /* Server Component */ }`
- API routes: always return error JSON, never throw to client
- Log errors before returning response (when logging implemented)

### Error Response Format
```typescript
NextResponse.json(
  { error: 'Clear user-facing message' },
  { status: 400 | 401 | 403 | 404 | 500 }
)
```

### Status Code Usage
- `400` - Invalid request data
- `401` - Unauthenticated
- `403` - Unauthorized (authenticated but not allowed)
- `404` - Resource not found
- `500` - Internal server error

## Validation Patterns

### Zod Schema Location
- Define schemas at top of route file or in separate schema file
- Import: `import { z } from 'zod'`
- Parse before using: `const data = schema.parse(await request.json())`

### Validation Example
```typescript
const createClientSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

// In route handler
const body = createClientSchema.parse(await request.json());
```

### Error Handling
- Zod parse failures: catch `ZodError` → `400` response
- Return first error: `error.errors[0].message`

## Async/Await Patterns

### Supabase Queries
- Always `await` Supabase operations
- Chain `.select()`, `.insert()`, `.update()`, `.delete()`
- Check for errors: `const { data, error } = await supabase.from(...)`
- Early return on error: `if (error) return NextResponse.json(...)`

### Server Client Creation
```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient(); // await required
  const { data, error } = await supabase.from('clients').select();
  // ...
}
```

### No Client Components in API Routes
- Never use `'use client'` in API routes
- Use `cookies()` from `next/headers` (async in Next 15)
- No React hooks in route handlers

## Authentication Patterns

### User ID Retrieval
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const userId = user.id;
```

### RLS Enforcement
- Database enforces RLS policies
- Always filter by `user_id` in queries for redundancy
- Trust RLS for security, explicit filters for clarity

## Database Query Patterns

### Row Level Security
- All tables have RLS enabled
- Policies enforce `auth.uid() = user_id`
- No manual user_id filtering needed (but recommended for clarity)

### Insert Pattern
```typescript
const { data, error } = await supabase
  .from('clients')
  .insert({ user_id: userId, name, address, lat, lng })
  .select()
  .single();
```

### Update Pattern
```typescript
const { data, error } = await supabase
  .from('clients')
  .update({ name, address })
  .eq('id', clientId)
  .select()
  .single();
```

### Delete Pattern
```typescript
const { error } = await supabase
  .from('clients')
  .delete()
  .eq('id', clientId);
```

### Query Pattern
```typescript
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

## Environment Variables

### Required Vars
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `GOOGLE_MAPS_API_KEY` - Server-side Google Maps key (not NEXT_PUBLIC)

### Usage Pattern
```typescript
// Client-safe (NEXT_PUBLIC prefix)
process.env.NEXT_PUBLIC_SUPABASE_URL!

// Server-only (no prefix)
process.env.GOOGLE_MAPS_API_KEY!
```

### Validation
- Use `!` assertion for required vars defined in `.env.local`
- Consider runtime validation for critical vars

## Import Patterns

### Path Aliases
- Use `@/` prefix for all imports: `import { createClient } from '@/lib/supabase/server'`
- Never use relative paths: `../../lib/...`
- Configured in `tsconfig.json`: `"@/*": ["./*"]`

### Import Order (Convention)
1. Next.js imports
2. Third-party imports
3. Type imports
4. Local imports (lib, components, types)

## Middleware Conventions

### Auth Middleware
- Defined in `/middleware.ts`
- Runs on all routes except static assets
- Uses `@/lib/supabase/middleware` updateSession
- No custom auth logic, delegate to Supabase

### Route Matcher
```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## Performance Patterns

### Database Indexes
- Leverage existing indexes: `idx_clients_user_id`, `idx_clients_active`
- Query with indexed columns: `.eq('user_id', userId)`
- Order by indexed columns for performance

### Caching
- No caching implemented yet
- Future: use Next.js `revalidatePath()` for data mutations
- Avoid client-side data caching (Supabase client handles)

## API Design Patterns

### RESTful Conventions
- `GET /api/clients` - List all
- `GET /api/clients/[id]` - Get one
- `POST /api/clients` - Create
- `PUT /api/clients/[id]` - Update
- `DELETE /api/clients/[id]` - Delete

### Request Body
- Parse with `await request.json()`
- Validate with Zod before using
- Return 400 on parse failures

### URL Parameters
- Dynamic routes: `/api/clients/[id]/route.ts`
- Access via: `params.id` (destructure from second arg)
- Validate params exist before using

### Response Body
- Success: `{ data: T }` or `{ data: T[] }`
- Error: `{ error: string }`
- Never mix data and error in same response
