import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Route, RouteStop } from '@/lib/types';
import type { Database } from '@/lib/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: routeId } = await params;

    // Fetch route
    const { data: rawRoute, error: routeError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .eq('user_id', user.id)
      .single();

    if (routeError || !rawRoute) {
      if (routeError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Route not found' },
          { status: 404 }
        );
      }
      console.error('Route fetch error:', routeError);
      return NextResponse.json(
        { error: 'Failed to fetch route' },
        { status: 500 }
      );
    }

    const route = rawRoute as Database['public']['Tables']['routes']['Row'];

    // Verify ownership via RLS (already done by eq('user_id', user.id))
    if (route.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch route stops with client details
    const { data: rawStops, error: stopsError } = await supabase
      .from('route_stops')
      .select(
        `
        id,
        client_id,
        address,
        lat,
        lng,
        stop_order,
        estimated_arrival,
        estimated_departure,
        duration_from_previous_minutes,
        distance_from_previous_km,
        visit_duration_minutes,
        is_included,
        clients (
          id,
          name
        )
      `
      )
      .eq('route_id', routeId)
      .order('stop_order', { ascending: true });

    if (stopsError) {
      console.error('Route stops fetch error:', stopsError);
      return NextResponse.json(
        { error: 'Failed to fetch route stops' },
        { status: 500 }
      );
    }

    // Transform stops and include client names
    const stops: RouteStop[] = (rawStops || []).map((stop: any) => ({
      id: stop.id,
      clientId: stop.client_id,
      clientName: stop.clients?.[0]?.name || null,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      stopOrder: stop.stop_order,
      estimatedArrival: stop.estimated_arrival,
      estimatedDeparture: stop.estimated_departure,
      durationFromPrevious: stop.duration_from_previous_minutes,
      distanceFromPrevious: stop.distance_from_previous_km,
      visitDuration: stop.visit_duration_minutes,
      isIncluded: stop.is_included,
    }));

    // Transform route to domain types
    const routeResponse: Route = {
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
    };

    return NextResponse.json(
      {
        route: routeResponse,
        stops,
        metadata: route.optimization_metadata,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get route error:', error);
    return NextResponse.json(
      { error: 'Failed to get route' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: routeId } = await params;

    // Fetch route to verify ownership
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select('user_id')
      .eq('id', routeId)
      .single();

    if (routeError || !route) {
      if (routeError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Route not found' },
          { status: 404 }
        );
      }
      console.error('Route fetch error:', routeError);
      return NextResponse.json(
        { error: 'Failed to fetch route' },
        { status: 500 }
      );
    }

    // Verify ownership
    if (route.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete route stops (cascade delete)
    const { error: stopsError } = await supabase
      .from('route_stops')
      .delete()
      .eq('route_id', routeId);

    if (stopsError) {
      console.error('Route stops delete error:', stopsError);
      return NextResponse.json(
        { error: 'Failed to delete route stops' },
        { status: 500 }
      );
    }

    // Delete route
    const { error: deleteError } = await supabase
      .from('routes')
      .delete()
      .eq('id', routeId);

    if (deleteError) {
      console.error('Route delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete route' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Route deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete route error:', error);
    return NextResponse.json(
      { error: 'Failed to delete route' },
      { status: 500 }
    );
  }
}
