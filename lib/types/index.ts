export type { Database } from './database';

export interface Client {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  is_active: boolean;
  created_at: string;
}

export interface Route {
  id: string;
  name: string;
  startAddress: string;
  startLat: number;
  startLng: number;
  startDatetime: string;
  endAddress: string;
  endLat: number;
  endLng: number;
  endDatetime: string;
  totalDistanceKm: number | null;
  totalDurationMinutes: number | null;
  totalVisits: number;
  skippedClientsCount?: number;
  createdAt: string;
}

export interface SkippedClientsInfo {
  ids: string[];
  count: number;
  message: string;
}

export interface RouteStop {
  id: string;
  clientId: string | null;
  clientName: string | null;
  address: string;
  lat: number;
  lng: number;
  stopOrder: number;
  estimatedArrival: string | null;
  estimatedDeparture: string | null;
  durationFromPrevious: number;
  distanceFromPrevious: number;
  visitDuration: number;
  isIncluded: boolean;
}

export interface SuggestedClient extends Client {
  distanceFromRouteLine: number;
  score: number;
}

export interface ImportResult {
  imported: number;
  failed: Array<{
    name: string;
    address: string;
    error: string;
  }>;
  clients: Client[];
}

export interface GeocodedAddress {
  address: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}
