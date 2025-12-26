import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';
import { createClient } from '@/lib/supabase/server';
import type { Route, RouteStop } from '@/lib/types';
import type { Database } from '@/lib/types/database';

const optimizeSchema = z.object({
  name: z.string().min(1).max(255),
  startAddress: z.string().min(1),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  startDatetime: z.string().datetime(),
  endAddress: z.string().min(1),
  endLat: z.number().min(-90).max(90),
  endLng: z.number().min(-180).max(180),
  endDatetime: z.string().datetime(),
  // Either clientIds OR targetAddress/targetLat/targetLng must be provided
  clientIds: z.array(z.string().uuid()).max(25).optional().default([]),
  // Custom target address (used when clientIds is empty)
  targetAddress: z.string().min(1).optional(),
  targetLat: z.number().min(-90).max(90).optional(),
  targetLng: z.number().min(-180).max(180).optional(),
  visitDurationMinutes: z.number().min(5).max(120).optional().default(20),
  lunchBreakStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  lunchBreakDurationMinutes: z.number().min(15).max(180).optional().nullable(),
  vehicleType: z.enum(['driving', 'bicycling', 'walking']).optional().default('driving'),
  optimizationMethod: z.enum(['simple_order', 'optimized']).optional().default('simple_order'),
}).refine(
  (data) => {
    // Must have at least one client OR a target address
    const hasClients = data.clientIds && data.clientIds.length > 0;
    const hasTargetAddress = data.targetAddress && data.targetLat !== undefined && data.targetLng !== undefined;
    return hasClients || hasTargetAddress;
  },
  { message: 'Either clientIds or target address (targetAddress, targetLat, targetLng) must be provided' }
);

interface Stop {
  type: 'start' | 'client' | 'target' | 'end';
  lat: number;
  lng: number;
  address: string;
  clientId?: string;
  clientName?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = optimizeSchema.parse(body);

    // Route to appropriate handler based on optimization method
    if (validated.optimizationMethod === 'optimized') {
      return createOptimizedRoute(validated, user, supabase);
    } else {
      return createSimpleOrderRoute(validated, user, supabase);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = (error as any).errors as Array<{ path: (string | number)[]; message: string }>;
      const firstError = errors[0];
      return NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: {
            field: String(firstError?.path?.join('.') || 'unknown'),
            message: firstError?.message || 'Validation failed',
          },
        },
        { status: 400 }
      );
    }

    console.error('Optimize route error:', error);
    return NextResponse.json(
      { error: 'Failed to create optimized route' },
      { status: 500 }
    );
  }
}

async function createSimpleOrderRoute(
  validated: z.infer<typeof optimizeSchema>,
  user: { id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<NextResponse> {
  try {

    const {
      name,
      startAddress,
      startLat,
      startLng,
      startDatetime,
      endAddress,
      endLat,
      endLng,
      endDatetime,
      clientIds,
      targetAddress,
      targetLat,
      targetLng,
      visitDurationMinutes,
    } = validated;

    // Determine if using clients or custom target address
    const hasClients = clientIds && clientIds.length > 0;
    const hasTargetAddress = targetAddress && targetLat !== undefined && targetLng !== undefined;

    let clientsData: Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
    }> = [];

    // Fetch clients if using clientIds
    if (hasClients) {
      const { data: rawClientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, lat, lng')
        .eq('user_id', user.id)
        .in('id', clientIds);

      clientsData = rawClientsData as typeof clientsData || [];

      if (clientsError || !rawClientsData) {
        return NextResponse.json(
          { error: 'Failed to fetch clients' },
          { status: 500 }
        );
      }

      if (clientsData.length !== clientIds.length) {
        return NextResponse.json(
          { error: 'One or more clients not found or access denied' },
          { status: 403 }
        );
      }
    }

    // Build stops array: start → clients/target → end
    const routeStopsInput: Stop[] = [
      {
        type: 'start',
        lat: startLat,
        lng: startLng,
        address: startAddress,
      },
    ];

    // Add either clients or custom target
    if (hasClients) {
      routeStopsInput.push(
        ...clientsData.map((client) => ({
          type: 'client' as const,
          lat: client.lat,
          lng: client.lng,
          address: client.name,
          clientId: client.id,
        }))
      );
    } else if (hasTargetAddress) {
      routeStopsInput.push({
        type: 'target' as const,
        lat: targetLat,
        lng: targetLng,
        address: targetAddress,
      });
    }

    // Add end point
    routeStopsInput.push({
      type: 'end',
      lat: endLat,
      lng: endLng,
      address: endAddress,
    });

    // Call Google Distance Matrix API
    const googleMapsClient = new GoogleMapsClient({});

    const origins = routeStopsInput.slice(0, -1).map((stop) => ({
      lat: stop.lat,
      lng: stop.lng,
    }));

    const destinations = routeStopsInput.slice(1).map((stop) => ({
      lat: stop.lat,
      lng: stop.lng,
    }));

    let distanceData: Array<{
      distance: number; // in meters
      duration: number; // in seconds
    }> = [];

    try {
      const distanceResponse = await googleMapsClient.distancematrix({
        params: {
          origins,
          destinations,
          mode: validated.vehicleType as any,
          key: process.env.GOOGLE_MAPS_API_KEY_SERVER!,
        },
        timeout: 10000,
      });

      if (distanceResponse.data.status !== 'OK') {
        console.error('Distance Matrix API error:', distanceResponse.data);
        return NextResponse.json(
          {
            error: 'Failed to calculate distances',
            code: 'DISTANCE_MATRIX_ERROR',
          },
          { status: 500 }
        );
      }

      // Extract distance and duration for each consecutive pair
      // We requested N origins and N destinations (same locations shifted)
      // The response matrix has one row per origin
      for (let i = 0; i < distanceResponse.data.rows.length; i++) {
        const row = distanceResponse.data.rows[i];
        const element = row.elements[i]; // Diagonal element for consecutive pair

        if (element.status !== 'OK') {
          console.error(`Distance calculation failed for leg ${i}:`, element);
          return NextResponse.json(
            {
              error: `Failed to calculate distance for leg ${i}`,
              code: 'DISTANCE_CALCULATION_FAILED',
            },
            { status: 500 }
          );
        }

        distanceData.push({
          distance: element.distance?.value || 0,
          duration: element.duration?.value || 0,
        });
      }
    } catch (error) {
      console.error('Distance Matrix API call failed:', error);
      return NextResponse.json(
        {
          error: 'Failed to calculate route distances',
          code: 'API_CALL_FAILED',
        },
        { status: 500 }
      );
    }

    // Calculate total distance and duration
    let totalDistanceKm = 0;
    let totalDurationMinutes = 0;

    for (const leg of distanceData) {
      totalDistanceKm += leg.distance / 1000;
      totalDurationMinutes += leg.duration / 60;
    }

    // All clients/targets are included (no optimization/skipping)
    const totalVisits = hasClients ? clientsData.length : (hasTargetAddress ? 1 : 0);

    // Insert route into database
    const { data: routeData, error: routeError } = await (
      supabase as any
    )
      .from('routes')
      .insert({
        user_id: user.id,
        name,
        start_address: startAddress,
        start_lat: startLat,
        start_lng: startLng,
        start_datetime: startDatetime,
        end_address: endAddress,
        end_lat: endLat,
        end_lng: endLng,
        end_datetime: endDatetime,
        total_distance_km: totalDistanceKm,
        total_duration_minutes: Math.round(totalDurationMinutes),
        total_visits: totalVisits,
        lunch_break_start_time: validated.lunchBreakStartTime,
        lunch_break_duration_minutes: validated.lunchBreakDurationMinutes,
        vehicle_type: validated.vehicleType,
        optimization_method: validated.optimizationMethod,
        optimization_metadata: {
          method: validated.optimizationMethod,
          note: 'Clients ordered as selected without optimization',
        },
      })
      .select()
      .single();

    if (routeError || !routeData) {
      console.error('Route insert error:', routeError);
      return NextResponse.json(
        { error: 'Failed to create route' },
        { status: 500 }
      );
    }

    // Build route stops with distance data
    const routeStops: Database['public']['Tables']['route_stops']['Insert'][] = [];

    let currentTime = new Date(startDatetime);
    let lunchBreakInserted = false;

    // Parse lunch break target time if provided
    let lunchBreakTargetTime: Date | null = null;
    if (validated.lunchBreakStartTime && validated.lunchBreakDurationMinutes) {
      const [hours, minutes] = validated.lunchBreakStartTime.split(':').map(Number);
      lunchBreakTargetTime = new Date(currentTime);
      lunchBreakTargetTime.setHours(hours, minutes, 0, 0);
    }

    // Add origin as first stop
    routeStops.push({
      route_id: routeData.id,
      client_id: null,
      address: startAddress,
      lat: startLat,
      lng: startLng,
      stop_order: 0,
      estimated_arrival: startDatetime,
      estimated_departure: startDatetime,
      duration_from_previous_minutes: 0,
      distance_from_previous_km: 0,
      visit_duration_minutes: 0,
      is_included: true,
      stop_type: 'start',
    });

    // Add client/target stops in order (skip first 'start' and last 'end' from routeStopsInput)
    const middleStops = routeStopsInput.slice(1, -1);
    for (let i = 0; i < middleStops.length; i++) {
      const stop = middleStops[i];
      const legData = distanceData[i]; // i-th leg is from start/previous to this stop

      if (!legData) {
        console.error(`Missing distance data for leg ${i}`);
        return NextResponse.json(
          { error: 'Failed to calculate route distances' },
          { status: 500 }
        );
      }

      // Add travel time from previous location
      const legDurationSeconds = legData.duration;
      const legDistanceKm = legData.distance / 1000;

      currentTime = new Date(currentTime.getTime() + legDurationSeconds * 1000);
      let arrivalTime = new Date(currentTime.getTime());

      // Check if lunch break should be inserted BEFORE this stop
      if (
        !lunchBreakInserted &&
        lunchBreakTargetTime &&
        validated.lunchBreakDurationMinutes &&
        arrivalTime >= lunchBreakTargetTime
      ) {
        // Get location of previous stop for lunch break
        const prevStop = routeStops[routeStops.length - 1];

        // Insert lunch break stop
        routeStops.push({
          route_id: routeData.id,
          client_id: null,
          address: 'Lunch Break',
          lat: prevStop.lat,
          lng: prevStop.lng,
          stop_order: routeStops.length,
          estimated_arrival: lunchBreakTargetTime.toISOString(),
          estimated_departure: new Date(
            lunchBreakTargetTime.getTime() + validated.lunchBreakDurationMinutes * 60 * 1000
          ).toISOString(),
          duration_from_previous_minutes: 0,
          distance_from_previous_km: 0,
          visit_duration_minutes: validated.lunchBreakDurationMinutes,
          is_included: true,
          stop_type: 'break',
        });

        // Advance currentTime by break duration
        currentTime = new Date(
          lunchBreakTargetTime.getTime() + validated.lunchBreakDurationMinutes * 60 * 1000
        );
        lunchBreakInserted = true;

        // Recalculate arrival at current stop after break
        arrivalTime = new Date(currentTime.getTime());
      }

      const departureTime = new Date(arrivalTime.getTime() + visitDurationMinutes * 60 * 1000);

      routeStops.push({
        route_id: routeData.id,
        client_id: stop.clientId || null,
        address: stop.address,
        lat: stop.lat,
        lng: stop.lng,
        stop_order: routeStops.length,
        estimated_arrival: arrivalTime.toISOString(),
        estimated_departure: departureTime.toISOString(),
        duration_from_previous_minutes: Math.round(legDurationSeconds / 60),
        distance_from_previous_km: Math.round(legDistanceKm * 100) / 100,
        visit_duration_minutes: visitDurationMinutes,
        is_included: true,
        stop_type: stop.type === 'target' ? 'target' : 'client',
      });

      // Update current time to departure time for next iteration
      currentTime = departureTime;
    }

    // Add final destination as last stop
    const finalLegData = distanceData[distanceData.length - 1]; // Last leg to end point
    if (finalLegData) {
      const finalLegDurationSeconds = finalLegData.duration;
      const finalLegDistanceKm = finalLegData.distance / 1000;

      currentTime = new Date(currentTime.getTime() + finalLegDurationSeconds * 1000);

      routeStops.push({
        route_id: routeData.id,
        client_id: null,
        address: endAddress,
        lat: endLat,
        lng: endLng,
        stop_order: routeStops.length,
        estimated_arrival: currentTime.toISOString(),
        estimated_departure: endDatetime,
        duration_from_previous_minutes: Math.round(finalLegDurationSeconds / 60),
        distance_from_previous_km: Math.round(finalLegDistanceKm * 100) / 100,
        visit_duration_minutes: 0,
        is_included: true,
        stop_type: 'end',
      });
    }

    // Insert all route stops
    const { error: stopsError } = await (supabase as any)
      .from('route_stops')
      .insert(routeStops);

    if (stopsError) {
      console.error('Route stops insert error:', stopsError);
      // Continue anyway - route is created
    }

    // Fetch the created route with stops
    const { data: rawCreatedRoute, error: fetchError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeData.id)
      .single();

    const { data: rawCreatedStops, error: fetchStopsError } = await supabase
      .from('route_stops')
      .select('*')
      .eq('route_id', routeData.id)
      .order('stop_order', { ascending: true });

    const createdRoute = rawCreatedRoute as Database['public']['Tables']['routes']['Row'] | null;
    const createdStops = rawCreatedStops as Database['public']['Tables']['route_stops']['Row'][] | null;

    if (fetchError || !createdRoute) {
      return NextResponse.json(
        { error: 'Failed to fetch created route' },
        { status: 500 }
      );
    }

    // Transform to domain types
    const route: Route = {
      id: createdRoute.id,
      name: createdRoute.name,
      startAddress: createdRoute.start_address,
      startLat: createdRoute.start_lat,
      startLng: createdRoute.start_lng,
      startDatetime: createdRoute.start_datetime,
      endAddress: createdRoute.end_address,
      endLat: createdRoute.end_lat,
      endLng: createdRoute.end_lng,
      endDatetime: createdRoute.end_datetime,
      totalDistanceKm: createdRoute.total_distance_km,
      totalDurationMinutes: createdRoute.total_duration_minutes,
      totalVisits: createdRoute.total_visits,
      skippedClientsCount: 0, // No clients skipped in simplified approach
      lunchBreakStartTime: createdRoute.lunch_break_start_time,
      lunchBreakDurationMinutes: createdRoute.lunch_break_duration_minutes,
      vehicleType: createdRoute.vehicle_type as any,
      createdAt: createdRoute.created_at,
    };

    const stops: RouteStop[] = (createdStops || []).map((stop) => ({
      id: stop.id,
      clientId: stop.client_id,
      clientName: null, // Would need a join to get this
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

    return NextResponse.json(
      {
        route,
        stops,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Simple order route creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create route' },
      { status: 500 }
    );
  }
}

async function createOptimizedRoute(
  validated: z.infer<typeof optimizeSchema>,
  user: { id: string },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<NextResponse> {
  try {
    const {
      name,
      startAddress,
      startLat,
      startLng,
      startDatetime,
      endAddress,
      endLat,
      endLng,
      endDatetime,
      clientIds,
      visitDurationMinutes,
    } = validated;

    // Verify all client IDs belong to the user
    const { data: rawClientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, lat, lng')
      .eq('user_id', user.id)
      .in('id', clientIds);

    const clientsData = rawClientsData as Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
    }> | null;

    if (clientsError || !clientsData) {
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    if (clientsData.length !== clientIds.length) {
      return NextResponse.json(
        { error: 'One or more clients not found or access denied' },
        { status: 403 }
      );
    }

    // Travel mode mapping for Google Routes API
    const travelModeMap: Record<string, string> = {
      driving: 'DRIVE',
      bicycling: 'BICYCLE',
      walking: 'WALK',
    };

    // Call Google Routes Optimization API
    const routesApiUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: startLat,
            longitude: startLng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: endLat,
            longitude: endLng,
          },
        },
      },
      intermediates: clientsData.map((c) => ({
        location: {
          latLng: {
            latitude: c.lat,
            longitude: c.lng,
          },
        },
      })),
      travelMode: travelModeMap[validated.vehicleType],
      optimizeWaypointOrder: true,
      routingPreference: 'TRAFFIC_UNAWARE',
    };

    let optimizationResponse;
    try {
      const response = await fetch(routesApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY_SERVER!,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs,routes.optimizedIntermediateWaypointIndex',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Routes API error:', response.status, errorText);

        if (response.status === 429) {
          return NextResponse.json(
            {
              error: 'Route optimization quota exceeded. Please try simple_order method or try again later.',
              code: 'QUOTA_EXCEEDED',
            },
            { status: 429 }
          );
        }

        throw new Error(`Google Routes API error: ${response.status}`);
      }

      optimizationResponse = await response.json();
    } catch (error) {
      console.error('Google Routes API call failed:', error);
      return NextResponse.json(
        {
          error: 'Failed to optimize route. Please try simple_order method.',
          code: 'OPTIMIZATION_API_ERROR',
        },
        { status: 500 }
      );
    }

    // Extract optimized waypoint order
    const googleRoute = optimizationResponse.routes?.[0];
    if (!googleRoute) {
      return NextResponse.json(
        { error: 'No route found from optimization API' },
        { status: 500 }
      );
    }

    const optimizedOrder = googleRoute.optimizedIntermediateWaypointIndex || [];
    const legs = googleRoute.legs || [];

    // Reorder clients according to optimization
    const orderedClients = optimizedOrder.map((index: number) => clientsData[index]);

    // Calculate totals from legs
    let totalDistanceKm = 0;
    let totalDurationSeconds = 0;

    for (const leg of legs) {
      totalDistanceKm += (leg.distanceMeters || 0) / 1000;
      totalDurationSeconds += parseInt(leg.duration?.replace('s', '') || '0', 10);
    }

    const totalDurationMinutes = totalDurationSeconds / 60;
    const totalVisits = orderedClients.length;

    // Insert route into database
    const { data: routeData, error: routeError } = await (
      supabase as any
    )
      .from('routes')
      .insert({
        user_id: user.id,
        name,
        start_address: startAddress,
        start_lat: startLat,
        start_lng: startLng,
        start_datetime: startDatetime,
        end_address: endAddress,
        end_lat: endLat,
        end_lng: endLng,
        end_datetime: endDatetime,
        total_distance_km: totalDistanceKm,
        total_duration_minutes: Math.round(totalDurationMinutes),
        total_visits: totalVisits,
        lunch_break_start_time: validated.lunchBreakStartTime,
        lunch_break_duration_minutes: validated.lunchBreakDurationMinutes,
        vehicle_type: validated.vehicleType,
        optimization_method: validated.optimizationMethod,
        optimization_metadata: {
          method: 'optimized',
          api: 'google_routes_v2',
          original_order: clientIds,
          optimized_order: optimizedOrder,
          waypoint_count: clientsData.length,
        },
      })
      .select()
      .single();

    if (routeError || !routeData) {
      console.error('Route insert error:', routeError);
      return NextResponse.json(
        { error: 'Failed to create route' },
        { status: 500 }
      );
    }

    // Build route stops with optimized order
    const routeStops: Database['public']['Tables']['route_stops']['Insert'][] = [];

    let currentTime = new Date(startDatetime);
    let lunchBreakInserted = false;

    // Parse lunch break target time if provided
    let lunchBreakTargetTime: Date | null = null;
    if (validated.lunchBreakStartTime && validated.lunchBreakDurationMinutes) {
      const [hours, minutes] = validated.lunchBreakStartTime.split(':').map(Number);
      lunchBreakTargetTime = new Date(currentTime);
      lunchBreakTargetTime.setHours(hours, minutes, 0, 0);
    }

    // Add origin as first stop
    routeStops.push({
      route_id: routeData.id,
      client_id: null,
      address: startAddress,
      lat: startLat,
      lng: startLng,
      stop_order: 0,
      estimated_arrival: startDatetime,
      estimated_departure: startDatetime,
      duration_from_previous_minutes: 0,
      distance_from_previous_km: 0,
      visit_duration_minutes: 0,
      is_included: true,
      stop_type: 'start',
    });

    // Add client stops in optimized order
    for (let i = 0; i < orderedClients.length; i++) {
      const client = orderedClients[i];
      const leg = legs[i]; // i-th leg is from start/previous to this client

      if (!leg) {
        console.error(`Missing leg data for stop ${i}`);
        continue;
      }

      // Extract distance and duration from leg
      const legDistanceKm = (leg.distanceMeters || 0) / 1000;
      const legDurationSeconds = parseInt(leg.duration?.replace('s', '') || '0', 10);

      // Add travel time from previous location
      currentTime = new Date(currentTime.getTime() + legDurationSeconds * 1000);
      let arrivalTime = new Date(currentTime.getTime());

      // Check if lunch break should be inserted BEFORE this stop
      if (
        !lunchBreakInserted &&
        lunchBreakTargetTime &&
        validated.lunchBreakDurationMinutes &&
        arrivalTime >= lunchBreakTargetTime
      ) {
        // Get location of previous stop for lunch break
        const prevStop = routeStops[routeStops.length - 1];

        // Insert lunch break stop
        routeStops.push({
          route_id: routeData.id,
          client_id: null,
          address: 'Lunch Break',
          lat: prevStop.lat,
          lng: prevStop.lng,
          stop_order: routeStops.length,
          estimated_arrival: lunchBreakTargetTime.toISOString(),
          estimated_departure: new Date(
            lunchBreakTargetTime.getTime() + validated.lunchBreakDurationMinutes * 60 * 1000
          ).toISOString(),
          duration_from_previous_minutes: 0,
          distance_from_previous_km: 0,
          visit_duration_minutes: validated.lunchBreakDurationMinutes,
          is_included: true,
          stop_type: 'break',
        });

        // Advance currentTime by break duration
        currentTime = new Date(
          lunchBreakTargetTime.getTime() + validated.lunchBreakDurationMinutes * 60 * 1000
        );
        lunchBreakInserted = true;

        // Recalculate arrival at current client after break
        arrivalTime = new Date(currentTime.getTime());
      }

      const departureTime = new Date(arrivalTime.getTime() + visitDurationMinutes * 60 * 1000);

      routeStops.push({
        route_id: routeData.id,
        client_id: client.id,
        address: client.name,
        lat: client.lat,
        lng: client.lng,
        stop_order: routeStops.length,
        estimated_arrival: arrivalTime.toISOString(),
        estimated_departure: departureTime.toISOString(),
        duration_from_previous_minutes: Math.round(legDurationSeconds / 60),
        distance_from_previous_km: Math.round(legDistanceKm * 100) / 100,
        visit_duration_minutes: visitDurationMinutes,
        is_included: true,
        stop_type: 'client',
      });

      // Update current time to departure time for next iteration
      currentTime = departureTime;
    }

    // Add final destination as last stop
    const finalLeg = legs[legs.length - 1];
    if (finalLeg) {
      const finalLegDistanceKm = (finalLeg.distanceMeters || 0) / 1000;
      const finalLegDurationSeconds = parseInt(finalLeg.duration?.replace('s', '') || '0', 10);

      currentTime = new Date(currentTime.getTime() + finalLegDurationSeconds * 1000);

      routeStops.push({
        route_id: routeData.id,
        client_id: null,
        address: endAddress,
        lat: endLat,
        lng: endLng,
        stop_order: routeStops.length,
        estimated_arrival: currentTime.toISOString(),
        estimated_departure: endDatetime,
        duration_from_previous_minutes: Math.round(finalLegDurationSeconds / 60),
        distance_from_previous_km: Math.round(finalLegDistanceKm * 100) / 100,
        visit_duration_minutes: 0,
        is_included: true,
        stop_type: 'end',
      });
    }

    // Insert all route stops
    const { error: stopsError } = await (supabase as any)
      .from('route_stops')
      .insert(routeStops);

    if (stopsError) {
      console.error('Route stops insert error:', stopsError);
      // Continue anyway - route is created
    }

    // Fetch the created route with stops
    const { data: rawCreatedRoute, error: fetchError } = await supabase
      .from('routes')
      .select('*')
      .eq('id', routeData.id)
      .single();

    const { data: rawCreatedStops, error: fetchStopsError } = await supabase
      .from('route_stops')
      .select('*')
      .eq('route_id', routeData.id)
      .order('stop_order', { ascending: true });

    const createdRoute = rawCreatedRoute as Database['public']['Tables']['routes']['Row'] | null;
    const createdStops = rawCreatedStops as Database['public']['Tables']['route_stops']['Row'][] | null;

    if (fetchError || !createdRoute) {
      return NextResponse.json(
        { error: 'Failed to fetch created route' },
        { status: 500 }
      );
    }

    // Transform to domain types
    const route: Route = {
      id: createdRoute.id,
      name: createdRoute.name,
      startAddress: createdRoute.start_address,
      startLat: createdRoute.start_lat,
      startLng: createdRoute.start_lng,
      startDatetime: createdRoute.start_datetime,
      endAddress: createdRoute.end_address,
      endLat: createdRoute.end_lat,
      endLng: createdRoute.end_lng,
      endDatetime: createdRoute.end_datetime,
      totalDistanceKm: createdRoute.total_distance_km,
      totalDurationMinutes: createdRoute.total_duration_minutes,
      totalVisits: createdRoute.total_visits,
      skippedClientsCount: 0,
      lunchBreakStartTime: createdRoute.lunch_break_start_time,
      lunchBreakDurationMinutes: createdRoute.lunch_break_duration_minutes,
      vehicleType: createdRoute.vehicle_type as any,
      optimizationMethod: createdRoute.optimization_method as any,
      createdAt: createdRoute.created_at,
    };

    const stops: RouteStop[] = (createdStops || []).map((stop) => ({
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

    return NextResponse.json(
      {
        route,
        stops,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Optimized route creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create optimized route' },
      { status: 500 }
    );
  }
}
