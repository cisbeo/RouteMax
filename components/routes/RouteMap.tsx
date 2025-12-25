'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, InfoWindow, LoadScript } from '@react-google-maps/api';
import type { Route, RouteStop } from '@/lib/types';

interface RouteMapProps {
  route: Route;
  stops: RouteStop[];
  googleMapsApiKey: string;
  selectedStopId?: string;
  onStopSelect?: (stopId: string) => void;
}

interface InfoWindowState {
  stopId: string | null;
  position: { lat: number; lng: number } | null;
}

export function RouteMap({
  route,
  stops,
  googleMapsApiKey,
  selectedStopId,
  onStopSelect,
}: RouteMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [infoWindow, setInfoWindow] = useState<InfoWindowState>({
    stopId: null,
    position: null,
  });

  const mapCenter = {
    lat: route.startLat,
    lng: route.startLng,
  };

  // Create marker icons only after Google Maps loads
  const getStartIcon = () => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#22c55e',
      fillOpacity: 1,
      strokeColor: '#16a34a',
      strokeWeight: 2,
    };
  };

  const getStopIcon = (isSelected: boolean) => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: isSelected ? 10 : 8,
      fillColor: '#ef4444',
      fillOpacity: 1,
      strokeColor: '#dc2626',
      strokeWeight: isSelected ? 3 : 2,
    };
  };

  const getEndIcon = () => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#3b82f6',
      fillOpacity: 1,
      strokeColor: '#1d4ed8',
      strokeWeight: 2,
    };
  };

  // Fetch directions using Directions API
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined' || !window.google?.maps) return;

    const includedStops = stops
      .filter((stop) => stop.isIncluded)
      .sort((a, b) => a.stopOrder - b.stopOrder);

    if (includedStops.length === 0) return;

    const directionsService = new window.google.maps.DirectionsService();

    // Build waypoints (exclude start/end, only intermediate stops)
    const waypoints = includedStops.map((stop) => ({
      location: { lat: stop.lat, lng: stop.lng },
      stopover: true,
    }));

    directionsService.route(
      {
        origin: { lat: route.startLat, lng: route.startLng },
        destination: { lat: route.endLat, lng: route.endLng },
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false, // Already optimized by our backend
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [isLoaded, route, stops]);

  // Calculate bounds to fit all markers
  useEffect(() => {
    if (!mapRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();

    bounds.extend(new window.google.maps.LatLng(route.startLat, route.startLng));
    bounds.extend(new window.google.maps.LatLng(route.endLat, route.endLng));

    stops.forEach((stop) => {
      bounds.extend(new window.google.maps.LatLng(stop.lat, stop.lng));
    });

    mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [route, stops]);

  const handleMarkerClick = (stop: RouteStop) => {
    setInfoWindow({
      stopId: stop.id,
      position: { lat: stop.lat, lng: stop.lng },
    });
    onStopSelect?.(stop.id);
  };

  const handleStartMarkerClick = () => {
    setInfoWindow({
      stopId: null,
      position: { lat: route.startLat, lng: route.startLng },
    });
  };

  const handleEndMarkerClick = () => {
    setInfoWindow({
      stopId: null,
      position: { lat: route.endLat, lng: route.endLng },
    });
  };

  return (
    <LoadScript
      googleMapsApiKey={googleMapsApiKey}
      onLoad={() => setIsLoaded(true)}
    >
      <GoogleMap
        mapContainerStyle={{
          width: '100%',
          height: '600px',
          borderRadius: '0.5rem',
        }}
        center={mapCenter}
        zoom={12}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          gestureHandling: 'auto',
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
        }}
      >
        {/* Start Marker */}
        {isLoaded && (
          <Marker
            position={{ lat: route.startLat, lng: route.startLng }}
            title="Start Location"
            icon={getStartIcon()}
            onClick={handleStartMarkerClick}
          />
        )}

        {/* Stop Markers */}
        {isLoaded && stops
          .filter((stop) => stop.isIncluded)
          .map((stop) => {
            const isSelected = selectedStopId === stop.id;
            return (
              <Marker
                key={stop.id}
                position={{ lat: stop.lat, lng: stop.lng }}
                title={stop.clientName || 'Stop ' + stop.stopOrder}
                label={{
                  text: String(stop.stopOrder),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
                icon={getStopIcon(isSelected)}
                onClick={() => handleMarkerClick(stop)}
              />
            );
          })}

        {/* End Marker */}
        {isLoaded && (
          <Marker
            position={{ lat: route.endLat, lng: route.endLng }}
            title="End Location"
            icon={getEndIcon()}
            onClick={handleEndMarkerClick}
          />
        )}

        {/* Directions Route */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true, // We show our own custom markers
              polylineOptions: {
                strokeColor: '#0ea5e9',
                strokeOpacity: 0.8,
                strokeWeight: 4,
              },
            }}
          />
        )}

        {/* Info Windows */}
        {infoWindow.stopId === null && infoWindow.position && (
          <InfoWindow
            position={infoWindow.position}
            onCloseClick={() => setInfoWindow({ stopId: null, position: null })}
          >
            <div className="text-sm font-semibold text-gray-900">
              {infoWindow.position.lat === route.startLat &&
              infoWindow.position.lng === route.startLng
                ? `Start: ${route.startAddress}`
                : `End: ${route.endAddress}`}
            </div>
          </InfoWindow>
        )}

        {infoWindow.stopId && (
          <InfoWindow
            position={
              infoWindow.position || {
                lat: stops.find((s) => s.id === infoWindow.stopId)?.lat || 0,
                lng: stops.find((s) => s.id === infoWindow.stopId)?.lng || 0,
              }
            }
            onCloseClick={() => setInfoWindow({ stopId: null, position: null })}
          >
            <div className="text-sm">
              <div className="font-semibold text-gray-900">
                {stops.find((s) => s.id === infoWindow.stopId)?.clientName || 'Stop'}
              </div>
              <div className="text-gray-600 text-xs mt-1">
                {stops.find((s) => s.id === infoWindow.stopId)?.address}
              </div>
              <div className="text-gray-500 text-xs mt-2">
                Stop #{stops.find((s) => s.id === infoWindow.stopId)?.stopOrder}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}
