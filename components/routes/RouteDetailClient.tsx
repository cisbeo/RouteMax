'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientSuggestions } from './ClientSuggestions';
import type { Route, RouteStop } from '@/lib/types';

interface RouteDetailClientProps {
  route: Route;
  stops: RouteStop[];
}

export function RouteDetailClient({ route, stops }: RouteDetailClientProps) {
  const router = useRouter();
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Get existing client IDs from current stops
  const existingClientIds = stops
    .filter((s) => s.clientId !== null)
    .map((s) => s.clientId as string);

  const handleRecalculate = async (newClientIds: string[]) => {
    setIsRecalculating(true);
    try {
      // Combine existing clients with new selections
      const allClientIds = [...existingClientIds, ...newClientIds];

      // Build request body, omitting null values
      const requestBody: Record<string, unknown> = {
        name: route.name,
        startAddress: route.startAddress,
        startLat: route.startLat,
        startLng: route.startLng,
        startDatetime: route.startDatetime,
        endAddress: route.endAddress,
        endLat: route.endLat,
        endLng: route.endLng,
        endDatetime: route.endDatetime,
        clientIds: allClientIds,
        visitDurationMinutes: stops[0]?.visitDuration || 20,
        vehicleType: route.vehicleType || 'driving',
      };

      // Only include lunch break if both values are set
      if (route.lunchBreakStartTime && route.lunchBreakDurationMinutes) {
        requestBody.lunchBreakStartTime = route.lunchBreakStartTime;
        requestBody.lunchBreakDurationMinutes = route.lunchBreakDurationMinutes;
      }

      const response = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.details?.message || errorData.error || 'Optimization failed';
        console.error('Optimize error:', errorData);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      // Redirect to the new optimized route
      router.push(`/dashboard/routes/${data.route.id}`);
      router.refresh();
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <ClientSuggestions
      route={route}
      existingClientIds={existingClientIds}
      onRecalculate={handleRecalculate}
    />
  );
}
