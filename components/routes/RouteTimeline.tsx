'use client';

import { format } from 'date-fns';
import type { Route, RouteStop } from '@/lib/types';

interface RouteTimelineProps {
  route: Route;
  stops: RouteStop[];
  selectedStopId?: string;
  onStopSelect?: (stopId: string) => void;
}

function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function RouteTimeline({
  route,
  stops,
  selectedStopId,
  onStopSelect,
}: RouteTimelineProps) {
  const includedStops = stops.filter((stop) => stop.isIncluded).sort((a, b) => a.stopOrder - b.stopOrder);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Route Timeline</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Total Distance</div>
          <div className="text-2xl font-bold text-blue-600">
            {route.totalDistanceKm ? formatDistance(route.totalDistanceKm) : 'N/A'}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Total Duration</div>
          <div className="text-2xl font-bold text-green-600">
            {route.totalDurationMinutes ? formatMinutesToTime(route.totalDurationMinutes) : 'N/A'}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Number of Stops</div>
          <div className="text-2xl font-bold text-purple-600">{includedStops.length}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {/* Start Point */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500">
              <span className="text-green-600 font-bold text-sm">S</span>
            </div>
            <div className="w-1 h-12 bg-gray-200 my-2" />
          </div>
          <div className="flex-1 pb-4">
            <h3 className="font-semibold text-gray-900">Start Location</h3>
            <p className="text-sm text-gray-600">{route.startAddress}</p>
            <p className="text-xs text-gray-500 mt-1">
              {format(new Date(route.startDatetime), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
        </div>

        {/* Stops */}
        {includedStops.map((stop, index) => {
          const isLast = index === includedStops.length - 1;
          const isSelected = selectedStopId === stop.id;
          const isBreak = stop.stopType === 'break';

          // Lunch break display
          if (isBreak) {
            return (
              <div key={stop.id}>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center border-2 border-yellow-400">
                      <span className="text-xl">☕</span>
                    </div>
                    {!isLast && <div className="w-1 h-12 bg-gray-200 my-2" />}
                  </div>
                  <div className="flex-1">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Lunch Break</span>
                        <span className="text-sm text-gray-600">({formatMinutesToTime(stop.visitDuration)})</span>
                      </div>
                      {stop.estimatedArrival && (
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(stop.estimatedArrival), 'HH:mm')} - {format(new Date(stop.estimatedDeparture!), 'HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Regular client stop display
          return (
            <div key={stop.id}>
              <div
                className={`flex gap-4 cursor-pointer transition-all ${
                  isSelected ? 'bg-blue-50 p-3 rounded-lg' : 'p-3'
                }`}
                onClick={() => onStopSelect?.(stop.id)}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all ${
                      isSelected
                        ? 'bg-red-100 text-red-600 border-red-500 scale-110'
                        : 'bg-red-100 text-red-600 border-red-500'
                    }`}
                  >
                    {stop.stopOrder}
                  </div>
                  {!isLast && <div className="w-1 h-12 bg-gray-200 my-2" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{stop.clientName || 'Stop ' + stop.stopOrder}</h3>
                  <p className="text-sm text-gray-600">{stop.address}</p>

                  {stop.estimatedArrival && (
                    <p className="text-xs text-gray-500 mt-1">
                      Arrival: {format(new Date(stop.estimatedArrival), 'HH:mm')}
                    </p>
                  )}

                  {stop.durationFromPrevious > 0 && (
                    <div className="mt-2 flex gap-4 text-xs text-gray-600">
                      {stop.distanceFromPrevious > 0 && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {formatDistance(stop.distanceFromPrevious)}
                        </span>
                      )}
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {formatMinutesToTime(stop.durationFromPrevious)} drive
                      </span>
                    </div>
                  )}

                  {stop.visitDuration > 0 && (
                    <p className="text-xs text-green-600 mt-2">
                      Visit duration: {formatMinutesToTime(stop.visitDuration)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* End Point */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-500">
              <span className="text-blue-600 font-bold text-sm">E</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">End Location</h3>
            <p className="text-sm text-gray-600">{route.endAddress}</p>
            <p className="text-xs text-gray-500 mt-1">
              {route.endDatetime ? format(new Date(route.endDatetime), 'dd/MM/yyyy HH:mm') : 'Not specified'}
            </p>
          </div>
        </div>
      </div>

      {/* Skipped Clients Info */}
      {route.skippedClientsCount && route.skippedClientsCount > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">{route.skippedClientsCount}</span> client
            {route.skippedClientsCount !== 1 ? 's' : ''} could not fit in this route due to time or distance constraints.
          </p>
        </div>
      )}
    </div>
  );
}
