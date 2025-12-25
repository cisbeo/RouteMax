import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { RouteMap } from '@/components/routes/RouteMap';
import { RouteTimeline } from '@/components/routes/RouteTimeline';
import { RouteActions } from '@/components/routes/RouteActions';
import type { Route, RouteStop } from '@/lib/types';
import type { Database } from '@/lib/types/database';

export const metadata = {
  title: 'Route Details - RouteMax',
  description: 'View route details and visualization',
};

interface RouteDetailResponse {
  route: Route;
  stops: RouteStop[];
  metadata?: Record<string, unknown>;
}

function RouteDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-8 bg-gray-300 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded w-2/3" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 bg-gray-300 rounded" />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-64 bg-gray-300 rounded" />
      </div>
    </div>
  );
}

async function RouteDetail({ routeId }: { routeId: string }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  try {
    // Fetch route directly from Supabase instead of using fetch()
    const { data: routeData, error: routeError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .eq('user_id', user.id)
      .single();

    if (routeError || !routeData) {
      notFound();
    }

    const { data: stopsData, error: stopsError } = await supabase
      .from('route_stops')
      .select('*')
      .eq('route_id', routeId)
      .order('stop_order', { ascending: true });

    if (stopsError) {
      throw new Error('Failed to fetch route stops');
    }

    // Transform database types to domain types
    const route: Route = {
      id: routeData.id,
      name: routeData.name,
      startAddress: routeData.start_address,
      startLat: routeData.start_lat,
      startLng: routeData.start_lng,
      startDatetime: routeData.start_datetime,
      endAddress: routeData.end_address,
      endLat: routeData.end_lat,
      endLng: routeData.end_lng,
      endDatetime: routeData.end_datetime,
      totalDistanceKm: routeData.total_distance_km,
      totalDurationMinutes: routeData.total_duration_minutes,
      totalVisits: routeData.total_visits,
      skippedClientsCount: 0,
      lunchBreakStartTime: routeData.lunch_break_start_time,
      lunchBreakDurationMinutes: routeData.lunch_break_duration_minutes,
      vehicleType: routeData.vehicle_type as any,
      createdAt: routeData.created_at,
    };

    const stops: RouteStop[] = (stopsData || []).map((stop) => ({
      id: stop.id,
      clientId: stop.client_id,
      clientName: null,
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
      stopType: stop.stop_type,
    }));

    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{route.name}</h1>
              <p className="text-gray-600 mt-2">
                Created {new Date(route.createdAt).toLocaleDateString([], {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <Link
              href="/dashboard/routes"
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Routes
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600">Total Distance</div>
              <div className="text-2xl font-bold text-blue-600">
                {route.totalDistanceKm ? `${route.totalDistanceKm.toFixed(1)} km` : 'N/A'}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600">Total Duration</div>
              <div className="text-2xl font-bold text-green-600">
                {route.totalDurationMinutes
                  ? `${Math.floor(route.totalDurationMinutes / 60)}h ${route.totalDurationMinutes % 60}m`
                  : 'N/A'}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600">Number of Stops</div>
              <div className="text-2xl font-bold text-purple-600">
                {stops.filter((s) => s.isIncluded).length}
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600">
                {route.skippedClientsCount ? 'Skipped' : 'All Clients'}
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {route.skippedClientsCount ? `${route.skippedClientsCount}` : '0'}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Route Map</h2>
          <RouteMap
            route={route}
            stops={stops}
            googleMapsApiKey={googleMapsApiKey}
          />
        </div>

        {/* Timeline and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RouteTimeline route={route} stops={stops} />
          </div>
          <div>
            <RouteActions route={route} stops={stops} />
          </div>
        </div>

        {/* Route Metadata (if available) */}
        {routeData.optimization_metadata && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Optimization Details</h2>
            <pre className="bg-gray-50 rounded p-4 text-xs text-gray-700 overflow-auto max-h-48">
              {JSON.stringify(routeData.optimization_metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Route detail error:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl">
        <h2 className="text-lg font-bold text-red-900 mb-2">Error Loading Route</h2>
        <p className="text-red-800">Failed to load route details. Please try again later.</p>
        <Link
          href="/dashboard/routes"
          className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Back to Routes
        </Link>
      </div>
    );
  }
}

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <Suspense fallback={<RouteDetailSkeleton />}>
          <RouteDetail routeId={id} />
        </Suspense>
      </div>
    </main>
  );
}
