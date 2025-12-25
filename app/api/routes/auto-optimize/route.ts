import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { VehicleType } from '@/lib/types';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const autoOptimizeSchema = z.object({
  name: z.string().min(1, 'Route name required').max(255, 'Route name too long'),

  // Point de départ
  startAddress: z.string().min(1, 'Start address required'),
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  startDatetime: z.string().datetime(),

  // Destination obligatoire
  mandatoryDestination: z.object({
    address: z.string().min(1, 'Destination address required'),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    clientId: z.string().uuid().optional(), // Optionnel si nouvelle adresse
  }),

  // Point d'arrivée
  endAddress: z.string().min(1, 'End address required'),
  endLat: z.number().min(-90).max(90),
  endLng: z.number().min(-180).max(180),
  maxReturnTime: z.string().datetime(), // CONTRAINTE DURE

  // Configuration
  visitDurationMinutes: z.number().min(5).max(120).optional().default(20),
  prospectSearchRadiusKm: z.number().min(1).max(20).optional().default(5),
  maxClientsPerDay: z.number().min(1).max(50).optional().default(25),
  lunchBreakStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  lunchBreakDurationMinutes: z.number().min(15).max(180).optional().nullable(),
  vehicleType: z.enum(['driving', 'bicycling', 'walking']).optional().default('driving'),
});

type AutoOptimizeInput = z.infer<typeof autoOptimizeSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface Waypoint {
  id?: string;
  name?: string;
  address: string;
  lat: number;
  lng: number;
  clientId?: string;
  isMandatory?: boolean;
  openingTime?: string; // Format: "HH:MM:SS"
  closingTime?: string; // Format: "HH:MM:SS"
}

interface GoogleRouteResponse {
  legs: Array<{
    distanceMeters: number;
    duration: string;
    startLocation: { latLng: { latitude: number; longitude: number } };
    endLocation: { latLng: { latitude: number; longitude: number } };
  }>;
  optimizedIntermediateWaypointIndex?: number[];
  distanceMeters: number;
  duration: string;
}

interface TimelineStop {
  address: string;
  lat: number;
  lng: number;
  clientId: string | null;
  clientName: string | null;
  stopOrder: number;
  estimatedArrival: string | null;
  estimatedDeparture: string | null;
  durationFromPrevious: number;
  distanceFromPrevious: number;
  visitDuration: number;
  isIncluded: boolean;
  stopType: 'start' | 'client' | 'lunch_break' | 'end';
}

interface Timeline {
  stops: TimelineStop[];
  totalDistance: number;
  totalDuration: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a visit time is within client opening hours
 * @param visitTime - ISO datetime string of visit
 * @param openingTime - Opening time in "HH:MM:SS" format
 * @param closingTime - Closing time in "HH:MM:SS" format
 * @returns true if visit is within opening hours
 */
function isWithinOpeningHours(
  visitTime: string,
  openingTime: string = '09:00:00',
  closingTime: string = '17:00:00'
): boolean {
  const visit = new Date(visitTime);
  const visitHours = visit.getHours();
  const visitMinutes = visit.getMinutes();
  const visitTimeInMinutes = visitHours * 60 + visitMinutes;

  // Parse opening/closing times
  const [openHour, openMin] = openingTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);
  const openingMinutes = openHour * 60 + openMin;
  const closingMinutes = closeHour * 60 + closeMin;

  return visitTimeInMinutes >= openingMinutes && visitTimeInMinutes <= closingMinutes;
}

/**
 * Parse duration string from Google Routes API v2
 * Handles multiple formats: "2340s", "23400", "390m", "6.5h"
 * @param duration - Duration string from Google API
 * @returns Duration in minutes
 */
function parseDurationToMinutes(duration: string | undefined): number {
  if (!duration) return 0;

  // Remove any whitespace
  const cleaned = duration.trim();

  // Check for suffix and convert accordingly
  if (cleaned.endsWith('s')) {
    // Seconds: "2340s" -> 2340 / 60 = 39 minutes
    return parseInt(cleaned.replace('s', '')) / 60;
  } else if (cleaned.endsWith('m')) {
    // Minutes: "390m" -> 390 minutes
    return parseInt(cleaned.replace('m', ''));
  } else if (cleaned.endsWith('h')) {
    // Hours: "6.5h" -> 6.5 * 60 = 390 minutes
    return parseFloat(cleaned.replace('h', '')) * 60;
  } else {
    // No suffix, assume seconds: "2340" -> 2340 / 60 = 39 minutes
    const value = parseInt(cleaned);
    return isNaN(value) ? 0 : value / 60;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Debug logging
    console.log('=== AUTO-OPTIMIZE API REQUEST ===');
    console.log('Request body:', JSON.stringify(body, null, 2));

    const validated = autoOptimizeSchema.parse(body);

    console.log('✅ Validation passed');

    return await createAutoOptimizedRoute(validated, user, supabase);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Zod Validation Error:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Auto-optimize route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// CORE LOGIC: CREATE AUTO-OPTIMIZED ROUTE
// ============================================================================

async function createAutoOptimizedRoute(
  validated: AutoOptimizeInput,
  user: { id: string },
  supabase: any
): Promise<NextResponse> {
  // 1. Trouver prospects le long de la route
  const prospects = await findProspectsAlongRoute(
    supabase,
    user.id,
    validated.startLat,
    validated.startLng,
    validated.mandatoryDestination.lat,
    validated.mandatoryDestination.lng,
    validated.endLat,
    validated.endLng,
    validated.prospectSearchRadiusKm
  );

  // 2. Merger destination obligatoire avec prospects (éviter doublons)
  const mandatoryWaypoint: Waypoint = {
    id: validated.mandatoryDestination.clientId,
    address: validated.mandatoryDestination.address,
    lat: validated.mandatoryDestination.lat,
    lng: validated.mandatoryDestination.lng,
    clientId: validated.mandatoryDestination.clientId,
    isMandatory: true,
  };

  let allWaypoints: Waypoint[] = [mandatoryWaypoint];

  // Filtrer les prospects qui ne sont pas la destination obligatoire
  const additionalProspects = prospects.filter(
    (p) => p.id !== validated.mandatoryDestination.clientId
  );

  allWaypoints.push(...additionalProspects);

  // 3. Limiter selon maxClientsPerDay et limite Google API (25 waypoints max)
  const maxWaypoints = Math.min(validated.maxClientsPerDay, 25);

  if (allWaypoints.length > maxWaypoints) {
    // Garder destination obligatoire + (maxWaypoints - 1) prospects les plus proches
    const sortedProspects = additionalProspects
      .sort((a, b) => {
        // Calculer distance approximative du centre de la route
        const centerLat = (validated.startLat + validated.endLat) / 2;
        const centerLng = (validated.startLng + validated.endLng) / 2;
        const distA = Math.sqrt(
          Math.pow(a.lat - centerLat, 2) + Math.pow(a.lng - centerLng, 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.lat - centerLat, 2) + Math.pow(b.lng - centerLng, 2)
        );
        return distA - distB;
      })
      .slice(0, maxWaypoints - 1);

    allWaypoints = [mandatoryWaypoint, ...sortedProspects];
  }

  // 4. Appeler Google Routes API
  const googleRoute = await callGoogleRoutesOptimizationAPI(
    validated.startLat,
    validated.startLng,
    validated.endLat,
    validated.endLng,
    allWaypoints,
    validated.vehicleType
  );

  // 5. Calculer timeline avec pause déjeuner
  const timeline = calculateTimeline(
    googleRoute,
    allWaypoints,
    validated.startDatetime,
    validated.visitDurationMinutes,
    validated.lunchBreakStartTime,
    validated.lunchBreakDurationMinutes
  );

  // 6. Vérifier contrainte de temps
  const finalStop = timeline.stops[timeline.stops.length - 1];
  const finalArrival = new Date(finalStop.estimatedArrival!);
  const maxReturnTime = new Date(validated.maxReturnTime);

  if (finalArrival > maxReturnTime) {
    // 7. Retirer des prospects jusqu'à respecter la contrainte
    return pruneProspectsToMeetDeadline(
      validated,
      allWaypoints,
      maxReturnTime,
      user,
      supabase
    );
  }

  // 8. Sauvegarder route + stops
  return saveRouteAndStops(
    validated,
    googleRoute,
    timeline,
    allWaypoints,
    user,
    supabase
  );
}

// ============================================================================
// FUNCTION: FIND PROSPECTS ALONG ROUTE
// ============================================================================

async function findProspectsAlongRoute(
  supabase: any,
  userId: string,
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  endLat: number,
  endLng: number,
  radiusKm: number
): Promise<Waypoint[]> {
  const radiusMeters = radiusKm * 1000;

  const { data, error } = await supabase.rpc('find_prospects_along_route', {
    p_user_id: userId,
    p_start_lat: startLat,
    p_start_lng: startLng,
    p_dest_lat: destLat,
    p_dest_lng: destLng,
    p_end_lat: endLat,
    p_end_lng: endLng,
    p_radius_meters: radiusMeters,
  });

  if (error) {
    console.error('PostGIS query error:', error);
    throw new Error('Failed to find prospects along route');
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    address: row.address || '',
    lat: row.lat,
    lng: row.lng,
    clientId: row.id,
    isMandatory: false,
    openingTime: row.opening_time || '09:00:00',
    closingTime: row.closing_time || '17:00:00',
  }));
}

// ============================================================================
// FUNCTION: CALL GOOGLE ROUTES OPTIMIZATION API
// ============================================================================

async function callGoogleRoutesOptimizationAPI(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  waypoints: Waypoint[],
  vehicleType: VehicleType
): Promise<GoogleRouteResponse> {
  const routesApiUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  const travelModeMap: Record<VehicleType, string> = {
    driving: 'DRIVE',
    bicycling: 'BICYCLE',
    walking: 'WALK',
  };

  const requestBody = {
    origin: {
      location: {
        latLng: { latitude: startLat, longitude: startLng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: endLat, longitude: endLng },
      },
    },
    intermediates: waypoints.map((w) => ({
      location: {
        latLng: { latitude: w.lat, longitude: w.lng },
      },
    })),
    travelMode: travelModeMap[vehicleType],
    optimizeWaypointOrder: true, // CLÉ: Google optimise l'ordre
    routingPreference: 'TRAFFIC_UNAWARE',
  };

  const response = await fetch(routesApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY_SERVER!,
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.legs,routes.optimizedIntermediateWaypointIndex',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Routes API error:', errorText);
    throw new Error('Failed to optimize route with Google API');
  }

  const data = await response.json();
  const googleRoute = data.routes?.[0];

  if (!googleRoute) {
    throw new Error('No route found from Google Routes API');
  }

  return {
    legs: googleRoute.legs,
    optimizedIntermediateWaypointIndex: googleRoute.optimizedIntermediateWaypointIndex || [],
    distanceMeters: googleRoute.distanceMeters,
    duration: googleRoute.duration,
  };
}

// ============================================================================
// FUNCTION: CALCULATE TIMELINE
// ============================================================================

function calculateTimeline(
  googleRoute: GoogleRouteResponse,
  waypoints: Waypoint[],
  startDatetime: string,
  visitDurationMinutes: number,
  lunchBreakStartTime: string | null | undefined,
  lunchBreakDurationMinutes: number | null | undefined
): Timeline {
  const stops: TimelineStop[] = [];
  let currentTime = new Date(startDatetime);

  // Stop de départ
  stops.push({
    address: '',
    lat: googleRoute.legs[0].startLocation.latLng.latitude,
    lng: googleRoute.legs[0].startLocation.latLng.longitude,
    clientId: null,
    clientName: null,
    stopOrder: 0,
    estimatedArrival: currentTime.toISOString(),
    estimatedDeparture: currentTime.toISOString(),
    durationFromPrevious: 0,
    distanceFromPrevious: 0,
    visitDuration: 0,
    isIncluded: true,
    stopType: 'start',
  });

  // Traiter chaque waypoint intermédiaire (tous les legs sauf le dernier)
  // Le dernier leg est traité séparément ci-dessous pour l'arrivée finale
  const waypointLegs = googleRoute.legs.slice(0, -1);

  waypointLegs.forEach((leg, index) => {
    // Voyage vers le prochain point
    const travelMinutes = parseDurationToMinutes(leg.duration);
    currentTime = new Date(currentTime.getTime() + travelMinutes * 60000);

    // Arrival at waypoint
    const waypointIndex = googleRoute.optimizedIntermediateWaypointIndex?.[index] ?? index;
    const waypoint = waypoints[waypointIndex];

    // Vérifier si la visite est dans les heures d'ouverture
    const arrivalTime = currentTime.toISOString();
    const isWithinHours = isWithinOpeningHours(
      arrivalTime,
      waypoint.openingTime,
      waypoint.closingTime
    );

    stops.push({
      address: waypoint.address,
      lat: waypoint.lat,
      lng: waypoint.lng,
      clientId: waypoint.clientId || null,
      clientName: waypoint.name || null,
      stopOrder: index + 1,
      estimatedArrival: arrivalTime,
      estimatedDeparture: new Date(
        currentTime.getTime() + visitDurationMinutes * 60000
      ).toISOString(),
      durationFromPrevious: travelMinutes,
      distanceFromPrevious: leg.distanceMeters / 1000,
      visitDuration: visitDurationMinutes,
      isIncluded: isWithinHours, // Client exclu si hors horaires
      stopType: 'client',
    });

    // Ajouter durée de visite seulement si le client est visitable
    if (isWithinHours) {
      currentTime = new Date(currentTime.getTime() + visitDurationMinutes * 60000);
    }
  });

  // Stop de fin
  const lastLeg = googleRoute.legs[googleRoute.legs.length - 1];
  const finalTravelMinutes = parseDurationToMinutes(lastLeg.duration);
  currentTime = new Date(currentTime.getTime() + finalTravelMinutes * 60000);

  stops.push({
    address: '',
    lat: lastLeg.endLocation.latLng.latitude,
    lng: lastLeg.endLocation.latLng.longitude,
    clientId: null,
    clientName: null,
    stopOrder: stops.length,
    estimatedArrival: currentTime.toISOString(),
    estimatedDeparture: currentTime.toISOString(),
    durationFromPrevious: finalTravelMinutes,
    distanceFromPrevious: lastLeg.distanceMeters / 1000,
    visitDuration: 0,
    isIncluded: true,
    stopType: 'end',
  });

  // Insérer pause déjeuner si configurée
  if (lunchBreakStartTime && lunchBreakDurationMinutes) {
    insertLunchBreak(stops, lunchBreakStartTime, lunchBreakDurationMinutes);
  }

  return {
    stops,
    totalDistance: googleRoute.distanceMeters / 1000,
    totalDuration: parseDurationToMinutes(googleRoute.duration),
  };
}

// ============================================================================
// FUNCTION: INSERT LUNCH BREAK
// ============================================================================

function insertLunchBreak(
  stops: TimelineStop[],
  lunchBreakStartTime: string,
  lunchBreakDurationMinutes: number
): void {
  const [targetHour, targetMinute] = lunchBreakStartTime.split(':').map(Number);

  // Trouver le stop le plus proche de l'heure cible
  let insertIndex = -1;
  let minTimeDiff = Infinity;

  for (let i = 1; i < stops.length - 1; i++) {
    const stop = stops[i];
    if (!stop.estimatedArrival) continue;

    const arrivalTime = new Date(stop.estimatedArrival);
    const arrivalMinutes = arrivalTime.getHours() * 60 + arrivalTime.getMinutes();
    const targetMinutes = targetHour * 60 + targetMinute;
    const timeDiff = Math.abs(arrivalMinutes - targetMinutes);

    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      insertIndex = i;
    }
  }

  if (insertIndex !== -1) {
    const lunchStop: TimelineStop = {
      address: 'Pause déjeuner',
      lat: stops[insertIndex].lat,
      lng: stops[insertIndex].lng,
      clientId: null,
      clientName: null,
      stopOrder: insertIndex + 0.5,
      estimatedArrival: stops[insertIndex].estimatedDeparture,
      estimatedDeparture: new Date(
        new Date(stops[insertIndex].estimatedDeparture!).getTime() +
          lunchBreakDurationMinutes * 60000
      ).toISOString(),
      durationFromPrevious: 0,
      distanceFromPrevious: 0,
      visitDuration: lunchBreakDurationMinutes,
      isIncluded: true,
      stopType: 'lunch_break',
    };

    stops.splice(insertIndex + 1, 0, lunchStop);

    // Ajuster les temps des stops suivants
    for (let i = insertIndex + 2; i < stops.length; i++) {
      if (stops[i].estimatedArrival) {
        const oldArrival = new Date(stops[i].estimatedArrival!);
        const newArrival = new Date(oldArrival.getTime() + lunchBreakDurationMinutes * 60000);
        stops[i].estimatedArrival = newArrival.toISOString();
      }
      if (stops[i].estimatedDeparture) {
        const oldDeparture = new Date(stops[i].estimatedDeparture!);
        const newDeparture = new Date(oldDeparture.getTime() + lunchBreakDurationMinutes * 60000);
        stops[i].estimatedDeparture = newDeparture.toISOString();
      }
    }
  }
}

// ============================================================================
// FUNCTION: PRUNE PROSPECTS TO MEET DEADLINE
// ============================================================================

async function pruneProspectsToMeetDeadline(
  validated: AutoOptimizeInput,
  waypoints: Waypoint[],
  maxReturnTime: Date,
  user: { id: string },
  supabase: any
): Promise<NextResponse> {
  let currentWaypoints = [...waypoints];
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Réoptimiser avec waypoints actuels
    const googleRoute = await callGoogleRoutesOptimizationAPI(
      validated.startLat,
      validated.startLng,
      validated.endLat,
      validated.endLng,
      currentWaypoints,
      validated.vehicleType
    );

    const timeline = calculateTimeline(
      googleRoute,
      currentWaypoints,
      validated.startDatetime,
      validated.visitDurationMinutes,
      validated.lunchBreakStartTime,
      validated.lunchBreakDurationMinutes
    );

    const finalStop = timeline.stops[timeline.stops.length - 1];
    const finalArrival = new Date(finalStop.estimatedArrival!);

    // Contrainte respectée ?
    if (finalArrival <= maxReturnTime) {
      return saveRouteAndStops(
        validated,
        googleRoute,
        timeline,
        currentWaypoints,
        user,
        supabase
      );
    }

    // Retirer le prospect le plus éloigné (sauf destination obligatoire)
    const removableProspects = currentWaypoints.filter((w) => !w.isMandatory);

    if (removableProspects.length === 0) {
      // Impossible même avec seulement la destination obligatoire
      const overtimeMinutes = Math.round((finalArrival.getTime() - maxReturnTime.getTime()) / 60000);

      return NextResponse.json(
        {
          error: 'Impossible de respecter la contrainte horaire même avec uniquement la destination obligatoire',
          code: 'TIME_CONSTRAINT_IMPOSSIBLE',
          details: {
            estimatedReturnTime: finalArrival.toISOString(),
            maxReturnTime: maxReturnTime.toISOString(),
            overtimeMinutes,
          },
        },
        { status: 400 }
      );
    }

    // Retirer le prospect le plus éloigné du centre de la route
    const centerLat = (validated.startLat + validated.endLat) / 2;
    const centerLng = (validated.startLng + validated.endLng) / 2;

    const furthest = removableProspects.reduce((max, prospect) => {
      const distProspect = Math.sqrt(
        Math.pow(prospect.lat - centerLat, 2) + Math.pow(prospect.lng - centerLng, 2)
      );
      const distMax = Math.sqrt(Math.pow(max.lat - centerLat, 2) + Math.pow(max.lng - centerLng, 2));
      return distProspect > distMax ? prospect : max;
    });

    currentWaypoints = currentWaypoints.filter((w) => w.id !== furthest.id);
    attempts++;
  }

  return NextResponse.json(
    {
      error: `Échec de l'optimisation après ${maxAttempts} tentatives`,
      code: 'OPTIMIZATION_FAILED',
    },
    { status: 500 }
  );
}

// ============================================================================
// FUNCTION: SAVE ROUTE AND STOPS
// ============================================================================

async function saveRouteAndStops(
  validated: AutoOptimizeInput,
  googleRoute: GoogleRouteResponse,
  timeline: Timeline,
  waypoints: Waypoint[],
  user: { id: string },
  supabase: any
): Promise<NextResponse> {
  // 1. Insérer route
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .insert({
      user_id: user.id,
      name: validated.name,
      start_address: validated.startAddress,
      start_lat: validated.startLat,
      start_lng: validated.startLng,
      start_datetime: validated.startDatetime,
      end_address: validated.endAddress,
      end_lat: validated.endLat,
      end_lng: validated.endLng,
      end_datetime: timeline.stops[timeline.stops.length - 1].estimatedArrival,
      total_distance_km: timeline.totalDistance,
      total_duration_minutes: Math.round(timeline.totalDuration),
      total_visits: waypoints.length,
      lunch_break_start_time: validated.lunchBreakStartTime,
      lunch_break_duration_minutes: validated.lunchBreakDurationMinutes,
      vehicle_type: validated.vehicleType,
      optimization_method: 'optimized',
      optimization_metadata: {
        prospects_found: waypoints.length,
        prospects_included: waypoints.length,
        search_radius_km: validated.prospectSearchRadiusKm,
        mandatory_destination: validated.mandatoryDestination,
      },
    })
    .select()
    .single();

  if (routeError) {
    console.error('Route insert error:', routeError);
    throw new Error('Failed to save route');
  }

  // 2. Insérer stops
  const stopsToInsert = timeline.stops.map((stop) => ({
    route_id: route.id,
    client_id: stop.clientId,
    address: stop.address,
    lat: stop.lat,
    lng: stop.lng,
    stop_order: stop.stopOrder,
    estimated_arrival: stop.estimatedArrival,
    estimated_departure: stop.estimatedDeparture,
    duration_from_previous_minutes: Math.round(stop.durationFromPrevious),
    distance_from_previous_km: stop.distanceFromPrevious,
    visit_duration_minutes: Math.round(stop.visitDuration),
    is_included: stop.isIncluded,
    stop_type: stop.stopType,
  }));

  const { error: stopsError } = await supabase.from('route_stops').insert(stopsToInsert);

  if (stopsError) {
    console.error('Stops insert error:', stopsError);
    throw new Error('Failed to save route stops');
  }

  // 3. Récupérer route complète avec stops
  const { data: fullRoute, error: fetchError } = await supabase
    .from('routes')
    .select(
      `
      *,
      route_stops (
        *,
        clients (name)
      )
    `
    )
    .eq('id', route.id)
    .single();

  if (fetchError) {
    console.error('Route fetch error:', fetchError);
    throw new Error('Failed to fetch created route');
  }

  return NextResponse.json({
    route: {
      id: fullRoute.id,
      name: fullRoute.name,
      startAddress: fullRoute.start_address,
      startLat: fullRoute.start_lat,
      startLng: fullRoute.start_lng,
      startDatetime: fullRoute.start_datetime,
      endAddress: fullRoute.end_address,
      endLat: fullRoute.end_lat,
      endLng: fullRoute.end_lng,
      endDatetime: fullRoute.end_datetime,
      totalDistanceKm: fullRoute.total_distance_km,
      totalDurationMinutes: fullRoute.total_duration_minutes,
      totalVisits: fullRoute.total_visits,
      lunchBreakStartTime: fullRoute.lunch_break_start_time,
      lunchBreakDurationMinutes: fullRoute.lunch_break_duration_minutes,
      vehicleType: fullRoute.vehicle_type,
      optimizationMethod: fullRoute.optimization_method,
      createdAt: fullRoute.created_at,
    },
    stops: fullRoute.route_stops.map((stop: any) => ({
      id: stop.id,
      clientId: stop.client_id,
      clientName: stop.clients?.name || null,
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
    })),
    prospectsFound: waypoints.length,
    prospectsIncluded: timeline.stops.filter(s => s.isIncluded && s.stopType === 'client').length,
    prospectsExcluded: timeline.stops.filter(s => !s.isIncluded && s.stopType === 'client').length,
    clientsOutsideOpeningHours: timeline.stops
      .filter(s => !s.isIncluded && s.stopType === 'client')
      .map(s => s.clientName)
      .filter(Boolean),
    timeConstraintMet: true,
  });
}
