import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Route } from '@/lib/types';
import type { Database } from '@/lib/types/database';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE))
    );

    const offset = (page - 1) * pageSize;

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('routes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json(
        { error: 'Failed to fetch routes count' },
        { status: 500 }
      );
    }

    // Fetch routes
    const { data: rawRoutes, error: routesError } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (routesError) {
      console.error('Routes fetch error:', routesError);
      return NextResponse.json(
        { error: 'Failed to fetch routes' },
        { status: 500 }
      );
    }

    // Count stops for each route
    const routes: (Route & { stopCount: number })[] = [];
    for (const rawRoute of rawRoutes || []) {
      const route = rawRoute as Database['public']['Tables']['routes']['Row'];

      const { count: stopCount } = await supabase
        .from('route_stops')
        .select('*', { count: 'exact', head: true })
        .eq('route_id', route.id);

      routes.push({
        id: route.id,
        name: route.name,
        startAddress: route.start_address,
        startLat: route.start_lat,
        startLng: route.start_lng,
        startDatetime: route.start_datetime,
        endAddress: route.end_address,
        endLat: route.end_lat,
        endLng: route.end_lng,
        endDatetime: route.end_datetime,
        totalDistanceKm: route.total_distance_km,
        totalDurationMinutes: route.total_duration_minutes,
        totalVisits: route.total_visits,
        skippedClientsCount: (route.optimization_metadata as any)?.skipped_clients?.count,
        createdAt: route.created_at,
        stopCount: stopCount || 0,
      });
    }

    const totalPages = Math.ceil((totalCount || 0) / pageSize);

    return NextResponse.json(
      {
        routes,
        pagination: {
          page,
          pageSize,
          totalCount: totalCount || 0,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get routes error:', error);
    return NextResponse.json(
      { error: 'Failed to get routes' },
      { status: 500 }
    );
  }
}
