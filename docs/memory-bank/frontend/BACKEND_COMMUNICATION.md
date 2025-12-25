# Frontend-Backend Communication

## Overview

RouteMax uses **Supabase** for database operations with Next.js 15 App Router. No REST API routes are currently implemented - all data access is via Supabase client.

## Authentication

### Supabase Auth Flow

**Client Setup**: @lib/supabase/client.ts
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
```

**Server Setup**: @lib/supabase/server.ts
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

**Middleware**: @middleware.ts + @lib/supabase/middleware.ts
- Runs on every request (except static assets)
- Validates and refreshes auth session
- Updates auth cookies via `supabase.auth.getUser()`

### Auth Patterns

**Client-side:**
```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Sign out
await supabase.auth.signOut()
```

**Server-side:**
```typescript
// In Server Component or Route Handler
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  redirect('/login')
}
```

---

## Data Access Patterns

### Direct Supabase Queries

All database operations use Supabase client directly (no API routes).

**Type Safety**: @lib/types/database.ts
```typescript
import { Database } from '@/lib/types/database'

// Typed table access
type Client = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']
```

### Common Query Patterns

**Fetch all clients:**
```typescript
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('is_active', true)
  .order('name')
```

**Insert client:**
```typescript
const { data, error } = await supabase
  .from('clients')
  .insert({
    name: 'Customer Name',
    address: '123 Street',
    lat: 40.7128,
    lng: -74.0060,
    user_id: user.id
  })
  .select()
  .single()
```

**Update client:**
```typescript
const { error } = await supabase
  .from('clients')
  .update({ is_active: false })
  .eq('id', clientId)
```

**Delete client:**
```typescript
const { error } = await supabase
  .from('clients')
  .delete()
  .eq('id', clientId)
```

**Fetch route with stops (JOIN):**
```typescript
const { data, error } = await supabase
  .from('routes')
  .select(`
    *,
    route_stops (
      *,
      clients (name, address)
    )
  `)
  .eq('id', routeId)
  .single()
```

---

## Error Handling

### Supabase Error Pattern

```typescript
const { data, error } = await supabase
  .from('clients')
  .select('*')

if (error) {
  console.error('Database error:', error.message)
  // Handle error (toast notification, etc.)
  return
}

// Use data safely
```

### Auth Errors

```typescript
const { error } = await supabase.auth.signInWithPassword({
  email,
  password
})

if (error) {
  if (error.message.includes('Invalid login credentials')) {
    // Show user-friendly message
  }
}
```

### RLS Policy Errors

```typescript
// Error when user tries to access another user's data
// RLS policies automatically return empty results or errors
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', otherUserId) // Will fail due to RLS

// Error: "new row violates row-level security policy"
```

---

## API Routes (Placeholder)

### Structure

Current empty API directories:
- @app/api/clients/
- @app/api/geocode/
- @app/api/routes/

### Future Route Handler Pattern

**Expected pattern** (when implemented):

```typescript
// app/api/geocode/route.ts
export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Process request
  // ...

  return Response.json({ data: result })
}
```

---

## Client Components

### "use client" Pattern

**Not yet implemented**, but expected usage:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ClientList() {
  const [clients, setClients] = useState<Client[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)

      if (!error && data) {
        setClients(data)
      }
    }

    fetchClients()
  }, [])

  return (
    <ul>
      {clients.map(client => (
        <li key={client.id}>{client.name}</li>
      ))}
    </ul>
  )
}
```

### Realtime Subscriptions

**Pattern for live updates:**

```typescript
'use client'

useEffect(() => {
  const channel = supabase
    .channel('clients-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        // Update state based on payload
        console.log('Change received!', payload)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

---

## Server Actions (Expected)

### "use server" Pattern

**Not yet implemented**, but expected for mutations:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createClient(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('clients')
    .insert({
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      user_id: user.id,
      // lat/lng from geocoding
    })

  if (error) throw error

  revalidatePath('/clients')
}
```

**Usage in Client Component:**

```typescript
'use client'

import { createClient } from '@/actions/clients'

export function NewClientForm() {
  return (
    <form action={createClient}>
      <input name="name" required />
      <input name="address" required />
      <button type="submit">Create Client</button>
    </form>
  )
}
```

---

## Request/Response Types

### Database Types

**Auto-generated**: @lib/types/database.ts

```typescript
export interface Database {
  public: {
    Tables: {
      clients: {
        Row: { id: string; user_id: string; name: string; ... }
        Insert: { id?: string; user_id: string; name: string; ... }
        Update: { id?: string; user_id?: string; ... }
      }
      routes: { ... }
      route_stops: { ... }
    }
  }
}
```

**Usage:**

```typescript
import type { Database } from '@/lib/types/database'

type Client = Database['public']['Tables']['clients']['Row']
type NewClient = Database['public']['Tables']['clients']['Insert']

const client: Client = await supabase.from('clients').select('*').single()
```

---

## Security

### Row Level Security (RLS)

All queries automatically scoped by RLS policies:

**Clients/Routes:**
- Policy: `auth.uid() = user_id`
- Users can only CRUD their own data

**Route Stops:**
- Policy: Checks parent route ownership via JOIN
- Users can only access stops for their own routes

### NEVER bypass RLS

```typescript
// ❌ WRONG - Don't use service role client in user-facing code
const supabase = createClient(url, serviceRoleKey)

// ✅ CORRECT - Use auth-scoped client
const supabase = await createClient() // Uses auth cookies
```

---

## Current State

**No API routes implemented yet**. All future data access will use:

1. **Direct Supabase queries** for reads (Server/Client Components)
2. **Server Actions** for mutations (forms, optimistic updates)
3. **API Routes** only for:
   - External API calls (Google Maps geocoding)
   - Complex business logic
   - Webhook handlers

**Next steps:**
- Implement client management components
- Add geocoding API route
- Build route optimization logic
- Add real-time route tracking
