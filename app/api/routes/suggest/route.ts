import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { SuggestedClient } from '@/lib/types';

const suggestSchema = z.object({
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  endLat: z.number().min(-90).max(90),
  endLng: z.number().min(-180).max(180),
  corridorRadiusKm: z.number().min(0.1).max(50).optional().default(5),
  maxSuggestions: z.number().min(1).max(50).optional().default(20),
  // Existing client IDs for building extended bounding box (loop routes)
  existingClientIds: z.array(z.string().uuid()).optional(),
});

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
    const validated = suggestSchema.parse(body);

    const { startLat, startLng, endLat, endLng, corridorRadiusKm, maxSuggestions, existingClientIds } = validated;

    // Check if this is a loop route (start === end) and we have existing waypoints
    const isLoopRoute = Math.abs(startLat - endLat) < 0.0001 && Math.abs(startLng - endLng) < 0.0001;
    const hasExistingClients = existingClientIds && existingClientIds.length > 0;

    let suggestedClients;
    let queryError;

    if (isLoopRoute && hasExistingClients) {
      // For loop routes: use polyline corridor through all waypoints
      const { data: existingClientsData, error: fetchError } = await supabase
        .from('clients')
        .select('lat, lng')
        .in('id', existingClientIds);

      if (fetchError || !existingClientsData) {
        console.error('Failed to fetch existing client coords:', fetchError);
        return await fallbackSuggest(supabase, user.id, validated);
      }

      // Build polyline points: start → clients → start (close the loop)
      const polylinePoints = [
        { lat: startLat, lng: startLng },
        ...existingClientsData,
        { lat: startLat, lng: startLng }, // Close the loop
      ];

      console.log('Loop route polyline:', {
        startPoint: { lat: startLat, lng: startLng },
        waypointCount: existingClientsData.length,
        totalPoints: polylinePoints.length,
        corridorRadiusKm,
      });

      const result = await supabase.rpc('suggest_clients_along_polyline', {
        p_user_id: user.id,
        p_points_json: polylinePoints, // Pass as array, Supabase converts to JSONB
        p_corridor_radius_m: corridorRadiusKm * 1000,
        p_max_results: maxSuggestions,
      });

      suggestedClients = result.data;
      queryError = result.error;
    } else {
      // Standard corridor search for non-loop routes
      const result = await supabase.rpc('suggest_clients_along_route', {
        p_user_id: user.id,
        p_start_lng: startLng,
        p_start_lat: startLat,
        p_end_lng: endLng,
        p_end_lat: endLat,
        p_corridor_radius_m: corridorRadiusKm * 1000,
        p_max_results: maxSuggestions,
      });

      suggestedClients = result.data;
      queryError = result.error;
    }

    if (queryError) {
      console.error('PostGIS query error:', queryError);
      // Fallback to in-memory calculation if RPC fails
      return await fallbackSuggest(supabase, user.id, validated);
    }

    const suggestions: SuggestedClient[] = (suggestedClients || []).map((row: {
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      is_active: boolean;
      created_at: string;
      distance_meters: number;
      score: number;
    }) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      is_active: row.is_active,
      created_at: row.created_at,
      distanceFromRouteLine: Math.round(row.distance_meters),
      score: Math.round(row.score),
    }));

    return NextResponse.json(
      { suggestions },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = (error as z.ZodError).errors;
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

    console.error('Suggest route error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

/**
 * Fallback to in-memory calculation if PostGIS RPC is not available
 */
async function fallbackSuggest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  params: z.infer<typeof suggestSchema>
): Promise<NextResponse> {
  const { startLat, startLng, endLat, endLng, corridorRadiusKm, maxSuggestions } = params;
  const corridorRadiusMeters = corridorRadiusKm * 1000;

  const { data: allClients, error: queryError } = await supabase
    .from('clients')
    .select('id, name, address, lat, lng, is_active, created_at')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (queryError || !allClients) {
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }

  const suggestedClients = allClients
    .map((client) => {
      const distance = calculatePointToLineDistance(
        client.lat,
        client.lng,
        startLat,
        startLng,
        endLat,
        endLng
      );

      if (distance > corridorRadiusMeters) return null;

      const score = Math.max(0, 100 - (distance / corridorRadiusMeters) * 100);

      return {
        id: client.id,
        name: client.name,
        address: client.address,
        lat: client.lat,
        lng: client.lng,
        is_active: client.is_active,
        created_at: client.created_at,
        distanceFromRouteLine: Math.round(distance),
        score: Math.round(score),
      };
    })
    .filter((client): client is SuggestedClient => client !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);

  return NextResponse.json(
    { suggestions: suggestedClients },
    { status: 200 }
  );
}

/**
 * Calculate perpendicular distance from a point to a line segment (fallback)
 */
function calculatePointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return haversineDistance(py, px, y1, x1);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return haversineDistance(py, px, closestY, closestX);
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
