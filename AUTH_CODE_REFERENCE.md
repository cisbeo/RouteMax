# Supabase Auth Implementation - Code Reference

## Quick Reference for Key Implementation Details

### 1. Login Page - Key Code Snippet
**File:** `/app/auth/login/page.tsx`

```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const emailValidation = emailSchema.safeParse(email);
  if (!emailValidation.success) {
    toast.error('Please enter a valid email address');
    return;
  }

  setLoading(true);

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: emailValidation.data,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setSubmitted(true);
    setEmail('');
    toast.success('Magic link sent! Check your email.');
  } catch (error) {
    toast.error('Failed to send magic link. Please try again.');
    console.error('Login error:', error);
  } finally {
    setLoading(false);
  }
};
```

### 2. Callback Handler - Key Code Snippet
**File:** `/app/auth/callback/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(
          errorDescription || 'An error occurred during authentication'
        )}`,
        request.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid_code', request.url));
  }

  try {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=exchange_failed&description=${encodeURIComponent(
            exchangeError.message
          )}`,
          request.url
        )
      );
    }

    return NextResponse.redirect(new URL('/dashboard/clients', request.url));
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL(
        '/auth/error?error=callback_error&description=An unexpected error occurred',
        request.url
      )
    );
  }
}
```

### 3. Logout Endpoint - Key Code Snippet
**File:** `/app/api/auth/logout/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
```

### 4. Navigation - User Fetch & Logout
**File:** `/components/layout/Navigation.tsx`

```typescript
// User state and auth check
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const getUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  getUser();
}, []);

// Logout handler
const handleLogout = async () => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    toast.success('Logged out successfully');
    setUser(null);
    router.push('/auth/login');
  } catch (error) {
    toast.error('Failed to logout');
    console.error('Logout error:', error);
  }
};
```

### 5. User Menu Display
**File:** `/components/layout/Navigation.tsx`

```typescript
{user ? (
  <div className="relative">
    <button
      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
      <span className="text-sm text-gray-700 font-medium">{user.email}</span>
    </button>

    {isUserMenuOpen && (
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-500">Signed in as</p>
          <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
        </div>
        <button
          onClick={() => {
            setIsUserMenuOpen(false);
            handleLogout();
          }}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          Logout
        </button>
      </div>
    )}
  </div>
) : (
  <Link href="/auth/login" className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium">
    Login
  </Link>
)}
```

## Email Schema Validation

```typescript
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');

// Usage
const emailValidation = emailSchema.safeParse(email);
if (!emailValidation.success) {
  toast.error('Please enter a valid email address');
  return;
}
```

## Conditional Navigation Based on Auth

```typescript
{user && (
  <>
    <Link href="/dashboard">Dashboard</Link>
    <Link href="/dashboard/clients">Clients</Link>
    <Link href="/dashboard/routes">Routes</Link>
  </>
)}
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Types Used

```typescript
import type { User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

// User state
const [user, setUser] = useState<User | null>(null);
```

## Client vs Server Client Usage

```typescript
// Browser/Client Component
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

// Server Component or API Route
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

## Common Error Messages

```typescript
// Email validation
'Invalid email address'

// Authentication
'Failed to send magic link. Please try again.'
'Logout failed'
'Failed to logout'

// Callback
'An error occurred during authentication'
'An unexpected error occurred'
```

## Magic Link URL Format

```
http://localhost:3000/auth/callback?code=abc123&type=magiclink
```

The `code` parameter is extracted and exchanged for a session in the callback route.

## Session Cookie Name

Supabase automatically manages session cookies:
- Cookie name: `sb-{project-id}-auth-token`
- Cookie scope: Application-wide
- Managed by: Middleware and SSR adapters

## Testing Magic Link Locally

1. Use a real email you can access
2. Or check Supabase dashboard email log
3. Or use Supabase test user feature

## Important Notes

1. **Never commit `.env.local`** - Use `.env.example` instead
2. **Email templates** are configurable in Supabase dashboard
3. **Redirect URL** must match exactly what's in Supabase settings
4. **Session timeout** is configurable in Supabase project settings
5. **Magic link expiration** defaults to 24 hours (configurable)

## Debugging

### Enable detailed logging
```typescript
// Add to any file for debugging
console.error('Auth error:', error);
console.log('User state:', user);
```

### Check Supabase Logs
1. Go to Supabase project dashboard
2. Check Authentication logs
3. Check Email sending logs

### Browser DevTools
1. Open DevTools → Application → Cookies
2. Look for `sb-{project-id}-auth-token`
3. Check Network tab for API calls
4. Check Console for errors

## Performance Considerations

1. User fetch happens once on mount
2. No polling - relies on session cookies
3. Logout immediately updates local state
4. Navigation menu updates synchronously
5. No unnecessary re-renders with proper state management

## Security Best Practices

1. Never log sensitive data
2. Always validate email input
3. Use HTTPS in production
4. Validate redirect URLs
5. Keep Supabase keys in environment
6. Monitor authentication logs
7. Set appropriate session timeouts
8. Use strong email verification

## Deployment Considerations

1. Update `NEXT_PUBLIC_APP_URL` for production
2. Add production redirect URL to Supabase settings
3. Configure SMTP provider for emails
4. Enable appropriate authentication methods
5. Monitor error logs
6. Test magic link flow
7. Verify email delivery
8. Set up alerts for auth failures
