'use client';

import { useRef, useEffect, useState } from 'react';

interface GooglePlacesAutocompleteProps {
  id: string;
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  onFocus?: () => void;
}

export function GooglePlacesAutocomplete({
  id,
  value,
  onChange,
  placeholder,
  className,
  error,
  onFocus,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isGeocoded, setIsGeocoded] = useState(false);

  useEffect(() => {
    // Check if Google Maps API is loaded
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      setIsLoaded(true);
    } else {
      // Wait for Google Maps to load
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }
  }, []);

  // Sync local value with prop value when it changes from parent
  useEffect(() => {
    setLocalValue(value);
    // If value is set from parent and not empty, assume it's geocoded
    if (value && value.trim()) {
      setIsGeocoded(true);
    }
  }, [value]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize autocomplete
    // No types restriction to match StandaloneSearchBox behavior
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'name'],
    });

    // Listen for place selection
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();

      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        // Use name if available (e.g., "Paris"), otherwise formatted_address
        const address = place.name || place.formatted_address || '';
        setLocalValue(address);
        setIsGeocoded(true);
        onChange(address, lat, lng);
      }
    });

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, onChange]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={localValue}
        onChange={(e) => {
          // Update local value only, don't notify parent until place is selected
          setLocalValue(e.target.value);
          setIsGeocoded(false);
        }}
        onFocus={onFocus}
        placeholder={placeholder}
        className={`${className} text-gray-900`}
        autoComplete="off"
      />
      {isGeocoded && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
          ✓
        </div>
      )}
      {!isLoaded && (
        <p className="text-xs text-gray-500 mt-1">
          Chargement de l'autocomplete...
        </p>
      )}
    </div>
  );
}
