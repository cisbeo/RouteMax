# RouteMax

**Optimisez vos tournées commerciales en quelques clics**

RouteMax automatically selects and sequences the best clients to visit along your route, saving traveling salespeople 2+ hours per week in manual planning.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL + PostGIS)
- **Authentication:** Supabase Auth (Magic Link)
- **APIs:** Google Maps, Places, Geocoding, Routes Optimization
- **Deployment:** Vercel

## Getting Started

### 1. Prerequisites

- Node.js 20+
- npm
- Supabase account
- Google Cloud account

### 2. Installation

```bash
npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key
GOOGLE_MAPS_API_KEY_SERVER=your-server-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

**⚠️ IMPORTANT: PostGIS requires manual configuration in Supabase**

See detailed setup instructions in [supabase/README.md](supabase/README.md)

Quick steps:
1. Enable PostGIS extension in Supabase Dashboard → Database → Extensions
2. Run migrations in SQL Editor:
   - `001_create_clients_table.sql`
   - `002_enable_postgis.sql`
   - `003_create_routes_table.sql`
   - `004_create_route_stops_table.sql`

### 5. Google Cloud Setup

1. Create a Google Cloud project
2. Enable APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Routes API
   - Distance Matrix API
3. Create API keys with proper restrictions
4. Set budget alerts ($50, $100, $200)

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
RouteMax/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── clients/          # Client management APIs
│   │   ├── routes/           # Route planning APIs
│   │   └── geocode/          # Geocoding utility API
│   ├── dashboard/            # Dashboard pages
│   │   ├── clients/          # Client management UI
│   │   └── routes/           # Route planning UI
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── clients/              # Client components
│   ├── routes/               # Route components
│   └── ui/                   # Shared UI components
├── lib/                      # Utilities
│   ├── supabase/             # Supabase clients
│   ├── types/                # TypeScript types
│   └── utils/                # Helper functions
├── supabase/                 # Database migrations
│   ├── migrations/           # SQL migration files
│   └── README.md             # Database setup guide
└── public/                   # Static assets
```

## Features

### Phase 1: Client Database ✅
- [x] CSV import
- [x] Address geocoding
- [x] Client list view
- [x] Client management

### Phase 2: Route Planning (In Progress)
- [ ] Route configuration form
- [ ] Client suggestions (PostGIS spatial queries)
- [ ] Google Places autocomplete
- [ ] Loading states

### Phase 3: Route Optimization
- [ ] Google Routes Optimization API integration
- [ ] Optimized route generation
- [ ] Error handling
- [ ] Skipped clients handling

### Phase 4: Route Visualization
- [ ] Map display with markers
- [ ] Route polyline
- [ ] Timeline view
- [ ] Google Maps export

### Phase 5: Polish
- [ ] Routes list
- [ ] Route history
- [ ] Responsive design
- [ ] Landing page
- [ ] SEO optimization

## Database Schema

- **clients**: User's client database with geocoded addresses
- **routes**: Saved route configurations and results
- **route_stops**: Ordered stops for each route

All tables have Row Level Security (RLS) enabled.

## API Routes

### Client Management
- `POST /api/clients/import` - Import clients from CSV
- `GET /api/clients` - List clients with pagination
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Delete client

### Route Planning
- `POST /api/routes/suggest` - Get client suggestions
- `POST /api/routes/optimize` - Create optimized route
- `GET /api/routes/[id]` - Get route details
- `GET /api/routes/user` - List user's routes
- `DELETE /api/routes/[id]` - Delete route

### Utilities
- `POST /api/geocode` - Geocode single address

## Cost Estimation

### Routes Optimization API
- $10 per 1,000 optimizations
- Budget alerts at $100, $150, $180

### Projections
- 100 users (5 routes/week): ~$20/month
- 500 users: ~$100/month
- 1,000 users: ~$200/month

## Development Standards

- TypeScript strict mode enabled
- All async operations wrapped in try-catch
- Input validation with Zod
- camelCase for variables
- PascalCase for components
- Comments for complex logic only
- Never hardcode secrets

## Anti-Scope (Not in MVP)

❌ CRM features
❌ Multi-day routes
❌ Advanced optimization (ML)
❌ Manual route editing
❌ Team accounts
❌ Payment/monetization
❌ Multi-vehicle routing

## Support

- [Database Setup Guide](supabase/README.md)
- [Full Specification](AGENTS.md)
- [Contributing](CONTRIBUTING.md)

## License

Private - All rights reserved
