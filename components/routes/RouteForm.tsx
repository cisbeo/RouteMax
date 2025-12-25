'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  StandaloneSearchBox,
} from '@react-google-maps/api';
import type { SuggestedClient, SkippedClientsInfo } from '@/lib/types';

interface RouteFormProps {
  googleMapsApiKey?: string; // Not used anymore, kept for compatibility
}

export function RouteForm({ googleMapsApiKey }: RouteFormProps) {
  const [routeName, setRouteName] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [startLat, setStartLat] = useState<number | null>(null);
  const [startLng, setStartLng] = useState<number | null>(null);
  const [endAddress, setEndAddress] = useState('');
  const [endLat, setEndLat] = useState<number | null>(null);
  const [endLng, setEndLng] = useState<number | null>(null);
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [maxDetourMinutes, setMaxDetourMinutes] = useState(15);

  // Route configuration parameters
  const [visitDurationMinutes, setVisitDurationMinutes] = useState(20);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Lunch break settings
  const [lunchBreakEnabled, setLunchBreakEnabled] = useState(false);
  const [lunchBreakStartTime, setLunchBreakStartTime] = useState('12:00');
  const [lunchBreakDurationMinutes, setLunchBreakDurationMinutes] = useState(60);

  // Vehicle type
  const [vehicleType, setVehicleType] = useState<'driving' | 'bicycling' | 'walking'>('driving');

  // Optimization method
  const [optimizationMethod, setOptimizationMethod] = useState<'simple_order' | 'optimized'>('simple_order');

  const [suggestions, setSuggestions] = useState<SuggestedClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [skippedClients, setSkippedClients] = useState<SkippedClientsInfo | null>(null);
  const [showSkippedClientsDialog, setShowSkippedClientsDialog] = useState(false);

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);

  const startSearchBoxRef = useRef<any>(null);
  const endSearchBoxRef = useRef<any>(null);

  const handleStartAddressSearch = useCallback(
    async (places: google.maps.places.PlaceResult[]) => {
      if (places.length === 0) return;

      const place = places[0];
      if (!place.formatted_address || !place.geometry?.location) {
        toast.error('Could not geocode address');
        return;
      }

      setStartAddress(place.formatted_address);
      setStartLat(place.geometry.location.lat());
      setStartLng(place.geometry.location.lng());
    },
    []
  );

  const handleEndAddressSearch = useCallback(
    async (places: google.maps.places.PlaceResult[]) => {
      if (places.length === 0) return;

      const place = places[0];
      if (!place.formatted_address || !place.geometry?.location) {
        toast.error('Could not geocode address');
        return;
      }

      setEndAddress(place.formatted_address);
      setEndLat(place.geometry.location.lat());
      setEndLng(place.geometry.location.lng());
    },
    []
  );

  const handleFindClients = async () => {
    if (!startLat || !startLng || !endLat || !endLng) {
      toast.error('Please enter both start and end addresses');
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/routes/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLat,
          startLng,
          endLat,
          endLng,
          corridorRadiusKm: maxDetourMinutes / 5, // Simple conversion: 5 min per km
          maxSuggestions: 20,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);

      if (data.suggestions.length === 0) {
        toast.info('No clients found near this route');
      } else {
        toast.success(`Found ${data.suggestions.length} nearby clients`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get suggestions';
      toast.error(message);
      console.error('Find clients error:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleClientToggle = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const handleCreateRoute = async () => {
    if (!routeName || !startAddress || !endAddress) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!startLat || !startLng || !endLat || !endLng) {
      toast.error('Invalid coordinates');
      return;
    }

    if (!startDateTime || !endDateTime) {
      toast.error('Please set start and end times');
      return;
    }

    if (selectedClients.size === 0) {
      toast.error('Please select at least one client');
      return;
    }

    setIsCreatingRoute(true);
    try {
      const response = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routeName,
          startAddress,
          startLat,
          startLng,
          startDatetime: new Date(startDateTime).toISOString(),
          endAddress,
          endLat,
          endLng,
          endDatetime: new Date(endDateTime).toISOString(),
          clientIds: Array.from(selectedClients),
          visitDurationMinutes,
          lunchBreakStartTime: lunchBreakEnabled ? lunchBreakStartTime : null,
          lunchBreakDurationMinutes: lunchBreakEnabled ? lunchBreakDurationMinutes : null,
          vehicleType,
          optimizationMethod,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          throw new Error(error.error);
        }
        throw new Error(error.error || 'Failed to create route');
      }

      const data = await response.json();

      if (data.skippedClients && data.skippedClients.count > 0) {
        setSkippedClients(data.skippedClients);
        setShowSkippedClientsDialog(true);
        toast.warning(data.skippedClients.message);
      } else {
        toast.success('Route created successfully');
      }

      // Reset form
      setRouteName('');
      setStartAddress('');
      setEndAddress('');
      setStartLat(null);
      setStartLng(null);
      setEndLat(null);
      setEndLng(null);
      setStartDateTime('');
      setEndDateTime('');
      setSuggestions([]);
      setSelectedClients(new Set());

      // Redirect to route details
      window.location.href = `/dashboard/routes/${data.route.id}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create route';
      toast.error(message);
      console.error('Create route error:', error);
    } finally {
      setIsCreatingRoute(false);
    }
  };

  const handleRetryWithSkippedClients = async () => {
    if (!skippedClients || skippedClients.ids.length === 0) return;

    setShowSkippedClientsDialog(false);
    setSelectedClients(new Set(skippedClients.ids));
    setSuggestions((prev) =>
      prev.filter((client) => skippedClients.ids.includes(client.id))
    );
    toast.info('Ready to create route with skipped clients');
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-6">Create New Route</h1>

        <div className="space-y-4">
          {/* Route Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Route Name
            </label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="e.g., Monday Morning Route"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Start Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Address
            </label>
            <StandaloneSearchBox
              onLoad={(ref) => (startSearchBoxRef.current = ref)}
              onPlacesChanged={() => {
                const places = startSearchBoxRef.current?.getPlaces?.();
                if (places) handleStartAddressSearch(places);
              }}
            >
              <input
                type="text"
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                placeholder="Enter start address"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </StandaloneSearchBox>
            {startLat && startLng && (
              <p className="text-xs text-gray-500 mt-1">
                Coordinates: {startLat.toFixed(4)}, {startLng.toFixed(4)}
              </p>
            )}
          </div>

          {/* End Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Address
            </label>
            <StandaloneSearchBox
              onLoad={(ref) => (endSearchBoxRef.current = ref)}
              onPlacesChanged={() => {
                const places = endSearchBoxRef.current?.getPlaces?.();
                if (places) handleEndAddressSearch(places);
              }}
            >
              <input
                type="text"
                value={endAddress}
                onChange={(e) => setEndAddress(e.target.value)}
                placeholder="Enter end address"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </StandaloneSearchBox>
            {endLat && endLng && (
              <p className="text-xs text-gray-500 mt-1">
                Coordinates: {endLat.toFixed(4)}, {endLng.toFixed(4)}
              </p>
            )}
          </div>

          {/* Start DateTime */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* End DateTime */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Time
            </label>
            <input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Max Detour Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Detour Time: {maxDetourMinutes} minutes
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={maxDetourMinutes}
              onChange={(e) => setMaxDetourMinutes(parseInt(e.target.value))}
              className="mt-1 w-full"
            />
          </div>

          {/* Advanced Settings Toggle */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span>⚙️ Advanced Settings</span>
              <svg
                className={`w-5 h-5 transform transition-transform ${
                  showAdvancedSettings ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvancedSettings && (
              <div className="mt-4 space-y-4 bg-gray-50 p-4 rounded-md">
                {/* Visit Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visit Duration per Client
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={visitDurationMinutes}
                      onChange={(e) => setVisitDurationMinutes(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                      {visitDurationMinutes} min
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Average time spent at each client location
                  </p>
                </div>

                {/* Lunch Break */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={lunchBreakEnabled}
                      onChange={(e) => setLunchBreakEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    Lunch Break
                  </label>

                  {lunchBreakEnabled && (
                    <div className="space-y-3 ml-6">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={lunchBreakStartTime}
                          onChange={(e) => setLunchBreakStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Duration</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="15"
                            max="180"
                            step="15"
                            value={lunchBreakDurationMinutes}
                            onChange={(e) => setLunchBreakDurationMinutes(parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                            {lunchBreakDurationMinutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="driving">🚗 Car</option>
                    <option value="bicycling">🚴 Bike</option>
                    <option value="walking">🚶 Walking</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Affects route calculation and speed estimates
                  </p>
                </div>

                {/* Optimization Method Toggle */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Méthode d'optimisation
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start p-3 border-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="optimization-method"
                        value="simple_order"
                        checked={optimizationMethod === 'simple_order'}
                        onChange={(e) => setOptimizationMethod(e.target.value as any)}
                        className="mt-1 w-4 h-4 text-blue-600"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-sm">Ordre simple (Gratuit)</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Visite les clients dans l'ordre de sélection.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start p-3 border-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="optimization-method"
                        value="optimized"
                        checked={optimizationMethod === 'optimized'}
                        onChange={(e) => setOptimizationMethod(e.target.value as any)}
                        className="mt-1 w-4 h-4 text-blue-600"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-sm">Route optimisée IA (Premium)</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Réordonne automatiquement pour la route la plus rapide.
                        </div>
                        <div className="text-xs text-amber-600 mt-1 font-medium">
                          ⚠️ Coût API plus élevé (~0,01€/route)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Find Clients Button */}
          <button
            onClick={handleFindClients}
            disabled={isLoadingSuggestions}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoadingSuggestions ? 'Finding Clients...' : 'Find Nearby Clients'}
          </button>

          {/* Client Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Available Clients ({suggestions.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-300 rounded-md p-3">
                {suggestions.map((client) => (
                  <label
                    key={client.id}
                    className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClients.has(client.id)}
                      onChange={() => handleClientToggle(client.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="ml-3 grow">
                      <div className="font-medium text-sm">{client.name}</div>
                      <div className="text-xs text-gray-600">{client.address}</div>
                      <div className="text-xs text-green-600">
                        Score: {client.score}/100 ({(client.distanceFromRouteLine / 1000).toFixed(2)}km from route)
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {selectedClients.size} client(s) selected
              </p>
            </div>
          )}

          {/* Create Route Button */}
          <button
            onClick={handleCreateRoute}
            disabled={isCreatingRoute || selectedClients.size === 0}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {isCreatingRoute ? 'Creating Route...' : 'Create Optimized Route'}
          </button>
        </div>

        {/* Skipped Clients Dialog */}
        {showSkippedClientsDialog && skippedClients && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-bold mb-2">Clients Could Not Be Included</h2>
              <p className="text-gray-700 mb-4">
                {skippedClients.message}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  {skippedClients.count} client(s) exceeded the available time window:
                </p>
                <ul className="text-xs text-yellow-700 mt-2 list-disc list-inside">
                  {skippedClients.ids.map((clientId) => {
                    const client = suggestions.find((c) => c.id === clientId);
                    return (
                      <li key={clientId}>
                        {client?.name || `Client ${clientId.slice(0, 8)}`}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSkippedClientsDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Continue
                </button>
                <button
                  onClick={handleRetryWithSkippedClients}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry with These Clients
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
