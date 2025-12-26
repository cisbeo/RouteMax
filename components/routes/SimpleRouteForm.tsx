'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { LoadScript, StandaloneSearchBox } from '@react-google-maps/api';
import type { Client } from '@/lib/types';

interface SimpleRouteFormProps {
  googleMapsApiKey: string;
  clients: Client[];
}

type TargetType = 'client' | 'address';

export function SimpleRouteForm({ googleMapsApiKey, clients }: SimpleRouteFormProps) {
  // Form fields
  const [routeName, setRouteName] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [startLat, setStartLat] = useState<number | null>(null);
  const [startLng, setStartLng] = useState<number | null>(null);
  const [endAddress, setEndAddress] = useState('');
  const [endLat, setEndLat] = useState<number | null>(null);
  const [endLng, setEndLng] = useState<number | null>(null);
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');

  // Target selection
  const [targetType, setTargetType] = useState<TargetType>('client');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [targetAddress, setTargetAddress] = useState('');
  const [targetLat, setTargetLat] = useState<number | null>(null);
  const [targetLng, setTargetLng] = useState<number | null>(null);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visitDurationMinutes, setVisitDurationMinutes] = useState(20);
  const [vehicleType, setVehicleType] = useState<'driving' | 'bicycling' | 'walking'>('driving');

  // Loading state
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);

  // Search box refs
  const startSearchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const endSearchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const targetSearchBoxRef = useRef<google.maps.places.SearchBox | null>(null);

  const handleStartAddressSearch = useCallback(
    (places: google.maps.places.PlaceResult[]) => {
      if (places.length === 0) return;
      const place = places[0];
      if (!place.formatted_address || !place.geometry?.location) {
        toast.error('Impossible de geocoder cette adresse');
        return;
      }
      setStartAddress(place.formatted_address);
      setStartLat(place.geometry.location.lat());
      setStartLng(place.geometry.location.lng());
    },
    []
  );

  const handleEndAddressSearch = useCallback(
    (places: google.maps.places.PlaceResult[]) => {
      if (places.length === 0) return;
      const place = places[0];
      if (!place.formatted_address || !place.geometry?.location) {
        toast.error('Impossible de geocoder cette adresse');
        return;
      }
      setEndAddress(place.formatted_address);
      setEndLat(place.geometry.location.lat());
      setEndLng(place.geometry.location.lng());
    },
    []
  );

  const handleTargetAddressSearch = useCallback(
    (places: google.maps.places.PlaceResult[]) => {
      if (places.length === 0) return;
      const place = places[0];
      if (!place.formatted_address || !place.geometry?.location) {
        toast.error('Impossible de geocoder cette adresse');
        return;
      }
      setTargetAddress(place.formatted_address);
      setTargetLat(place.geometry.location.lat());
      setTargetLng(place.geometry.location.lng());
    },
    []
  );

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setTargetAddress(client.address);
      setTargetLat(client.lat);
      setTargetLng(client.lng);
    }
  };

  const handleCopyStartToEnd = () => {
    setEndAddress(startAddress);
    setEndLat(startLat);
    setEndLng(startLng);
  };

  const handleCreateRoute = async () => {
    // Validation
    if (!routeName.trim()) {
      toast.error('Veuillez entrer un nom de tournee');
      return;
    }
    if (!startAddress || startLat === null || startLng === null) {
      toast.error('Veuillez entrer une adresse de depart valide');
      return;
    }
    if (!endAddress || endLat === null || endLng === null) {
      toast.error('Veuillez entrer une adresse de retour valide');
      return;
    }
    if (!startDateTime || !endDateTime) {
      toast.error('Veuillez definir les horaires de depart et de fin');
      return;
    }

    // Target validation
    if (targetType === 'client' && !selectedClientId) {
      toast.error('Veuillez selectionner un client');
      return;
    }
    if (targetType === 'address' && (targetLat === null || targetLng === null)) {
      toast.error('Veuillez entrer une adresse cible valide');
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
          // Pass single client or target as array
          clientIds: targetType === 'client' ? [selectedClientId] : [],
          // For custom address, we pass target info
          targetAddress: targetType === 'address' ? targetAddress : undefined,
          targetLat: targetType === 'address' ? targetLat : undefined,
          targetLng: targetType === 'address' ? targetLng : undefined,
          visitDurationMinutes,
          vehicleType,
          optimizationMethod: 'simple_order',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la creation de la route');
      }

      const data = await response.json();
      toast.success('Route creee avec succes !');
      window.location.href = `/dashboard/routes/${data.route.id}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la creation';
      toast.error(message);
      console.error('Create route error:', error);
    } finally {
      setIsCreatingRoute(false);
    }
  };

  const activeClients = clients.filter((c) => c.is_active);

  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={['places']}>
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Nouvelle Tournee</h1>

        <div className="space-y-5">
          {/* Route Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la tournee <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Ex: Visite client Dupont"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Start Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Point de depart <span className="text-red-500">*</span>
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
                placeholder="Entrez votre adresse de depart"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </StandaloneSearchBox>
            {startLat && startLng && (
              <p className="text-xs text-green-600 mt-1">
                Adresse validee
              </p>
            )}
          </div>

          {/* Target Selection */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Client ou destination cible <span className="text-red-500">*</span>
            </label>

            {/* Toggle between client and address */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setTargetType('client')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  targetType === 'client'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Client existant
              </button>
              <button
                type="button"
                onClick={() => setTargetType('address')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  targetType === 'address'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Autre adresse
              </button>
            </div>

            {targetType === 'client' ? (
              <div>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Selectionnez un client --</option>
                  {activeClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.address}
                    </option>
                  ))}
                </select>
                {activeClients.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    Aucun client actif. Importez des clients dabord.
                  </p>
                )}
              </div>
            ) : (
              <StandaloneSearchBox
                onLoad={(ref) => (targetSearchBoxRef.current = ref)}
                onPlacesChanged={() => {
                  const places = targetSearchBoxRef.current?.getPlaces?.();
                  if (places) handleTargetAddressSearch(places);
                }}
              >
                <input
                  type="text"
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  placeholder="Entrez ladresse de destination"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </StandaloneSearchBox>
            )}

            {targetLat && targetLng && (
              <p className="text-xs text-green-600 mt-2">
                Destination validee
              </p>
            )}
          </div>

          {/* End Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Point de retour <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
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
                    placeholder="Entrez votre adresse de retour"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </StandaloneSearchBox>
              </div>
              {startAddress && (
                <button
                  type="button"
                  onClick={handleCopyStartToEnd}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 whitespace-nowrap"
                  title="Copier le point de depart"
                >
                  = Depart
                </button>
              )}
            </div>
            {endLat && endLng && (
              <p className="text-xs text-green-600 mt-1">
                Adresse validee
              </p>
            )}
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Depart <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retour max <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <span>{showAdvanced ? '−' : '+'}</span>
              <span>Parametres avances</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 bg-gray-50 p-4 rounded-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duree de visite
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={visitDurationMinutes}
                      onChange={(e) => setVisitDurationMinutes(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-16 text-right">
                      {visitDurationMinutes} min
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode de transport
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="driving">Voiture</option>
                    <option value="bicycling">Velo</option>
                    <option value="walking">A pied</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleCreateRoute}
            disabled={isCreatingRoute}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isCreatingRoute ? 'Creation en cours...' : 'Creer la tournee'}
          </button>
        </div>
      </div>
    </LoadScript>
  );
}
