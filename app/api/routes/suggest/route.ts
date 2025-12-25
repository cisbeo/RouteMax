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

    const { startLat, startLng, endLat, endLng, corridorRadiusKm, maxSuggestions } = validated;

    // Convert corridor radius from km to meters
    const corridorRadiusMeters = corridorRadiusKm * 1000;

    // Query all active clients for the user
    const { data: allClients, error: queryError } = await supabase
      .from('clients')
      .select('id, name, address, lat, lng, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (queryError || !allClients) {
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    // Calculate distance from each client to route line (simple point-to-line distance)
    const suggestedClients = allClients
      .map((rawClient) => {
        const client = rawClient as {
          id: string;
          name: string;
          address: string;
          lat: number;
          lng: number;
          is_active: boolean;
          created_at: string;
        };

        const distance = calculatePointToLineDistance(
          client.lat,
          client.lng,
          startLat,
          startLng,
          endLat,
          endLng
        );

        // Only include clients within corridor radius
        if (distance > corridorRadiusMeters) {
          return null;
        }

        // Score based on proximity (closer = higher score)
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

    console.error('Suggest route error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

/**
 * Calculate perpendicular distance from a point to a line segment
 * Using the formula for distance from point to line in 2D space
 */
function calculatePointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  // Vector from start to end of line
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Length squared of line segment
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Line segment is a point
    return haversineDistance(py, px, y1, x1);
  }

  // Parameter t of the projection of point onto line
  // Clamped to [0, 1] to handle points beyond line segment
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  // Closest point on line segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  // Distance from point to closest point on line (in meters using Haversine)
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
  const R = 6371000; // Earth radius in meters
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
