# API Key Security Configuration

## Overview

RouteMax uses two separate Google Cloud API keys for security:
1. **Browser API Key** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) - Client-side only
2. **Server API Key** (`GOOGLE_MAPS_API_KEY_SERVER`) - Server-side only

## Browser API Key Setup

This key is exposed in the browser and MUST have restrictions.

### 1. Create/Select Browser Key

In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials):
- Key name: **"RouteMax Browser Key"**

### 2. Application Restrictions

Choose **HTTP referrers (web sites)**:

**Development:**
```
http://localhost:3000/*
http://127.0.0.1:3000/*
```

**Production:**
```
https://yourdomain.com/*
https://*.yourdomain.com/*
```

**Combined (Dev + Prod):**
```
http://localhost:3000/*
http://127.0.0.1:3000/*
https://yourdomain.com/*
https://*.yourdomain.com/*
```

### 3. API Restrictions

Restrict to these APIs only:
- ✅ Maps JavaScript API
- ✅ Places API

❌ **Do NOT enable:**
- Distance Matrix API
- Geocoding API
- Directions API
- Routes API

### 4. Update Environment Variable

```env
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...your-browser-key
```

---

## Server API Key Setup

This key runs server-side only and should have NO HTTP referrer restrictions.

### 1. Create/Select Server Key

In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials):
- Key name: **"RouteMax Server Key"**

### 2. Application Restrictions

Choose **None** (or IP addresses if you have static IPs)

⚠️ **IMPORTANT**: Do NOT use HTTP referrers for server keys

### 3. API Restrictions

Restrict to these APIs only:
- ✅ Geocoding API
- ✅ Distance Matrix API
- ✅ Directions API

❌ **Do NOT enable:**
- Maps JavaScript API
- Places API

### 4. Update Environment Variable

```env
# .env.local
GOOGLE_MAPS_API_KEY_SERVER=AIzaSy...your-server-key
```

---

## Security Best Practices

### 1. Never Commit Keys to Git

Add to `.gitignore`:
```
.env.local
.env*.local
```

### 2. Rotate Keys Regularly

- Rotate every 90 days
- Rotate immediately if key is exposed

### 3. Monitor Usage

Set up budget alerts in Google Cloud:
1. Go to **Billing → Budgets & alerts**
2. Create budget alert for Maps API usage
3. Set threshold at 80% and 100%

### 4. Production Deployment

For Vercel/Netlify deployment:

```bash
# Set environment variables
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
vercel env add GOOGLE_MAPS_API_KEY_SERVER production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

---

## Verification

### Test Browser Key

Open browser console on your site:
```javascript
// Should work
new google.maps.Map(...)
new google.maps.places.Autocomplete(...)

// Should fail (using server APIs)
fetch('https://maps.googleapis.com/maps/api/geocode/json?...')
```

### Test Server Key

Run test script:
```bash
npx tsx scripts/test-distance-matrix.ts
```

Should see: ✅ Distance Matrix API is working!

---

## Troubleshooting

### "API keys with referer restrictions cannot be used with this API"

**Cause**: Using browser key for server API call

**Fix**: Use `GOOGLE_MAPS_API_KEY_SERVER` for server calls

### "InvalidKeyMapError" or "RefererNotAllowedMapError"

**Cause**: Browser key HTTP referrer doesn't match current domain

**Fix**: Add current domain to browser key restrictions

### "This API project is not authorized to use this API"

**Cause**: API not enabled in restrictions

**Fix**: Add required API to key's API restrictions

---

## Cost Optimization

### Current API Usage

| API | Usage | Cost/1000 requests |
|-----|-------|-------------------|
| Maps JavaScript API | Per page load | $7.00 |
| Places Autocomplete | Per keystroke | $2.83 (session) |
| Geocoding API | Per client import | $5.00 |
| Distance Matrix API | Per route creation | $5.00 |
| Directions API | Per route display | $5.00 |

### Free Tier

Google provides $200/month credit = ~40,000 geocoding requests/month

### Optimization Tips

1. **Cache geocoding results** - Store lat/lng in database
2. **Session tokens for autocomplete** - Reduces cost to $2.83/session
3. **Limit route complexity** - Max 25 waypoints per route
4. **Use Distance Matrix wisely** - Already optimized (called once per route)

---

## Emergency Key Rotation

If a key is compromised:

1. **Immediately delete** the exposed key in Google Cloud Console
2. **Create new key** with same restrictions
3. **Update environment variables**:
   ```bash
   # Local
   vim .env.local  # Update key

   # Vercel
   vercel env rm GOOGLE_MAPS_API_KEY_SERVER production
   vercel env add GOOGLE_MAPS_API_KEY_SERVER production

   # Redeploy
   vercel --prod
   ```
4. **Monitor billing** for 48 hours for unexpected usage

---

## References

- [Google Maps Platform API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Application Restrictions](https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)
