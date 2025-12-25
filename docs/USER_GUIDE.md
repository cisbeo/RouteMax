# RouteMax User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Managing Clients](#managing-clients)
3. [Creating Routes](#creating-routes)
4. [Advanced Route Settings](#advanced-route-settings)
5. [Viewing & Exporting Routes](#viewing--exporting-routes)

---

## Getting Started

### 1. Sign In

RouteMax uses magic link authentication:
1. Navigate to `/auth/login`
2. Enter your email address
3. Check your inbox for the magic link
4. Click the link to sign in

### 2. Dashboard Overview

After signing in, you'll see the dashboard with:
- **Clients**: Manage your customer database
- **Routes**: Create and view optimized routes
- **New Route**: Quick access to route creation

---

## Managing Clients

### Import Clients from CSV

1. Go to **Clients** → **Import CSV**
2. Prepare CSV file with columns:
   ```csv
   name,address
   "Boulangerie Martin","15 Rue de la Paix, 75002 Paris"
   "Restaurant Le Gourmet","42 Avenue des Champs-Élysées, 75008 Paris"
   ```
3. Upload file
4. Wait for geocoding (automatic address → coordinates conversion)
5. Review imported clients

**Notes**:
- Addresses are geocoded automatically using Google Geocoding API
- Invalid addresses will show errors
- Geocoding results are cached in database

### Add Single Client

1. Go to **Clients** → **Add New**
2. Fill in:
   - Client name
   - Full address
3. Click **Save**
4. Address is geocoded automatically

### Edit/Delete Clients

- **Edit**: Click client → Update details → Save
- **Delete**: Click client → Delete (confirmation required)
- **Deactivate**: Toggle "Active" status to hide without deleting

---

## Creating Routes

### Basic Route Creation

1. Go to **Routes** → **New Route**
2. Fill required fields:

   **Route Name**
   ```
   Example: "Monday Morning Route"
   Purpose: Identify route in your list
   ```

   **Start Address**
   ```
   Where you begin your route (e.g., warehouse, home office)
   Uses Google Places Autocomplete for easy input
   ```

   **End Address**
   ```
   Where you end your route (can be same as start)
   ```

   **Start Time**
   ```
   When you'll begin the route
   Format: Date + Time (e.g., 2025-12-25 09:00)
   ```

   **End Time**
   ```
   When you must finish the route
   Used to check if route fits in timeframe
   ```

   **Max Detour Time**
   ```
   How far off the direct path you're willing to go
   Range: 5-30 minutes
   Lower = faster route, but fewer clients
   Higher = more clients, but longer route
   ```

3. Click **Find Nearby Clients**
4. Select clients from suggestions
5. Click **Create Route**

### Understanding Client Suggestions

After clicking "Find Nearby Clients", RouteMax shows clients within your detour radius:

```
✓ Boulangerie Martin
  15 Rue de la Paix, 75002 Paris
  +8 min detour | 2.3 km from route
```

- **Green checkmark**: Within max detour time
- **+X min detour**: Extra time to visit this client
- **Distance**: How far off the direct route

**Selection Tips**:
- Select all clients initially
- RouteMax will optimize order automatically
- Uncheck clients if route becomes too long

---

## Advanced Route Settings

### Visit Duration Configuration

**Location**: Route creation form → **⚙️ Advanced Settings** → **Visit Duration per Client**

**Default**: 20 minutes per client

**Range**: 5-60 minutes

**Use Cases**:
- **5-10 min**: Quick deliveries, drop-offs
- **15-20 min**: Standard client visits, consultations
- **30-45 min**: Detailed presentations, installations
- **45-60 min**: Extended service calls, training sessions

**How it works**:
```
Total Route Time =
  Travel time between stops +
  (Number of clients × Visit duration) +
  Start/End times
```

**Example**:
```
Route with 10 clients, 20 min visits:
- Travel time: 60 minutes
- Visit time: 10 × 20 = 200 minutes
- Total: 260 minutes (4h 20min)
```

### Lunch Break Scheduling

**Location**: Route creation form → **⚙️ Advanced Settings** → **Lunch Break**

**How to enable**:
1. Check **Lunch Break** checkbox
2. Set **Start Time** (e.g., 12:00)
3. Adjust **Duration** slider (15-180 minutes)

**How it works**:
- RouteMax inserts a lunch break stop at the scheduled time
- Break is placed at the location of the previous stop
- All subsequent stops are shifted by the break duration
- Break appears in timeline with ☕ icon

**Example**:
```
11:45 AM - Client 5: Le Café
12:05 PM   Depart (20 min visit)
           [Lunch break scheduled at 12:00]
12:05 PM - 🔄 Lunch Break (60 min)
01:05 PM   Resume route
           ↓ 10 min drive (4.2 km)
01:15 PM - Client 6: Boulangerie Moderne
```

**Notes**:
- If break time is before first client, break is skipped
- If break time is after last client, break is skipped
- Total route duration includes break time

### Vehicle Type Selection

**Location**: Route creation form → **⚙️ Advanced Settings** → **Vehicle Type**

**Options**:
- 🚗 **Car** (default): Standard driving routes, highways allowed
- 🚴 **Bike**: Bicycle-friendly routes, bike lanes preferred
- 🚶 **Walking**: Pedestrian paths only, shortest walking distance

**How it works**:
- Affects Google Distance Matrix API calculations
- Changes route visualization on map
- Influences estimated travel times and distances

**Use Cases**:
- **Car**: Standard delivery routes, sales visits
- **Bike**: Urban areas, eco-friendly delivery, short distances
- **Walking**: Dense urban areas, pedestrian zones

**Example Differences**:
```
Same route, different vehicles:

🚗 Car:      45 km, 60 min travel time
🚴 Bike:     42 km, 120 min travel time (bike lanes)
🚶 Walking:  38 km, 480 min travel time (shortcuts)
```

### Coming Soon Features

**Working Hours** (Planned)
- Define daily work schedule
- Prevent routes outside working hours
- Multi-day route support

---

## Viewing & Exporting Routes

### Route Details Page

After creating a route, you'll see:

**1. Route Summary**
```
📍 Total Distance: 45.2 km
⏱️  Total Duration: 4h 20m
🏢 Number of Stops: 12
🚫 Skipped Clients: 0
```

**2. Interactive Map**
- **Green marker**: Start point
- **Red numbered markers**: Client stops (in order)
- **Blue marker**: End point
- **Blue line**: Driving directions (real road routes)

**Map Features**:
- Click markers to see details
- Zoom/pan to explore
- Routes follow actual roads (via Google Directions API)

**3. Timeline View**
```
09:00 AM - Start: Warehouse Address
           ↓ 15 min drive (8.2 km)
09:15 AM - Client 1: Boulangerie Martin
09:35 AM   Depart (20 min visit)
           ↓ 8 min drive (3.1 km)
09:43 AM - Client 2: Restaurant Le Gourmet
...
```

Shows:
- Arrival/departure times for each stop
- Drive time between stops
- Visit duration at each location
- Running total of time/distance

### Export Options

**1. Export to Google Maps**
- Opens route in Google Maps app/web
- Mobile: Uses native Google Maps app
- Desktop: Opens in browser
- All waypoints included
- Ready for turn-by-turn navigation

**2. Copy Route Link**
- Copies shareable link to clipboard
- Share with team members
- Open on any device
- Requires RouteMax account to view

**3. Delete Route**
- Permanently removes route
- Confirmation required
- Cannot be undone

---

## Tips & Best Practices

### Optimizing Routes

**1. Group clients geographically**
```
✓ DO: Import all clients in one area before creating route
✗ DON'T: Create route, add client, create new route
```

**2. Use realistic visit durations**
```
Test a few visits and measure actual time:
- Entry/parking: 2-5 min
- Service: 10-15 min
- Checkout/payment: 3-5 min
Total: 15-25 min average
```

**3. Plan for traffic**
```
Add buffer to end time:
- Morning rush: +20-30%
- Midday: +10%
- Evening rush: +30-40%
```

### Client Management

**1. Keep addresses accurate**
```
✓ GOOD: "42 Avenue des Champs-Élysées, 75008 Paris"
✗ BAD: "Near the Arc de Triomphe"
```

**2. Use client notes (coming soon)**
```
Future feature: Add delivery instructions, access codes, etc.
```

**3. Regular cleanup**
```
Monthly: Deactivate clients no longer serviced
Quarterly: Delete permanently inactive clients
```

### Cost Management

**Monitor API usage**:
- Each route creation = 1 Directions API call + N Distance Matrix calls
- Each client import = 1 Geocoding API call per client
- Each autocomplete = ~1 Places API call per keystroke (session-based)

**Free tier**: $200/month Google Maps credit
- ~40 route creations/month
- ~1000 client imports/month
- ~5000 autocomplete sessions/month

---

## Troubleshooting

### Route Creation Fails

**Error: "Failed to calculate route distances"**

**Causes**:
1. No clients selected
2. Clients too far apart
3. Invalid addresses
4. API quota exceeded

**Solutions**:
1. Select at least 1 client
2. Reduce max detour or select closer clients
3. Verify client addresses in client list
4. Check Google Cloud billing/quotas

### Geocoding Fails

**Error: "Geocoding failed for address"**

**Common issues**:
```
✗ "123 Main St" - Too vague, no city
✓ "123 Main St, Paris, France" - Complete address

✗ "The blue house" - Not a valid address
✓ "15 Rue de la Paix, 75002 Paris" - Street + postal code

✗ "Near Eiffel Tower" - Descriptive, not address
✓ "5 Avenue Anatole France, 75007 Paris" - Actual address
```

### Map Not Loading

1. Check internet connection
2. Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
3. Check browser console for errors
4. Try different browser

### Magic Link Not Received

1. Check spam/junk folder
2. Verify email address is correct
3. Wait 2-3 minutes for delivery
4. Request new link
5. Check Supabase email settings

---

## Keyboard Shortcuts (Coming Soon)

Planned shortcuts:
```
N - New Route
C - Clients List
R - Routes List
/ - Search
? - Help
```

---

## FAQ

**Q: Can I create routes for multiple days?**
A: Not yet. Currently one route = one continuous trip. Multi-day support coming soon.

**Q: Can different clients have different visit durations?**
A: Not yet. Currently all clients use the same duration. Per-client durations coming soon.

**Q: Does RouteMax optimize the order of clients?**
A: Not yet. Current version preserves your selection order. TSP optimization coming soon.

**Q: Can I edit a route after creation?**
A: Not yet. Currently you must delete and recreate. Route editing coming soon.

**Q: Is my data private?**
A: Yes. All data is stored in your private Supabase database with Row-Level Security (RLS). Only you can access your clients and routes.

**Q: Can I export to other formats (Excel, PDF)?**
A: Not yet. Currently only Google Maps export. More formats coming soon.

**Q: Does it work offline?**
A: No. RouteMax requires internet connection for maps, geocoding, and route calculation.

---

## Support

**Issues/Bugs**: [GitHub Issues](https://github.com/yourusername/RouteMax/issues)

**Feature Requests**: Open a GitHub issue with label `enhancement`

**Documentation**: Check `/docs` folder in repository

---

## Version History

### v0.2.0 (Current)
- ✅ Client import (CSV)
- ✅ Basic route creation
- ✅ Google Maps integration
- ✅ Interactive map with directions
- ✅ Timeline view
- ✅ Configurable visit duration
- ✅ Magic link authentication
- ✅ **Lunch break scheduling**
- ✅ **Vehicle type selection (car, bike, walking)**

### Coming Soon
- 🔄 Route optimization (TSP solver)
- 🔄 Per-client visit durations
- 🔄 Route editing
- 🔄 Export to PDF/Excel
- 🔄 Client notes/instructions
- 🔄 Multi-day routes
