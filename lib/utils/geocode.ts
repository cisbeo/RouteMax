import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    const googleMapsClient = new GoogleMapsClient({});

    const response = await googleMapsClient.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY_SERVER!,
      },
      timeout: 5000,
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      throw new Error(`Geocoding failed for address: ${address}`);
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Geocoding error for "${address}": ${error.message}`);
    }
    throw error;
  }
}

export async function geocodeAddressesBatch(
  addresses: string[]
): Promise<Map<string, GeocodeResult | Error>> {
  const results = new Map<string, GeocodeResult | Error>();

  for (const address of addresses) {
    try {
      const result = await geocodeAddress(address);
      results.set(address, result);
    } catch (error) {
      results.set(address, error instanceof Error ? error : new Error(String(error)));
    }
  }

  return results;
}
