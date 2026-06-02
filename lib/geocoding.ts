const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || !GOOGLE_MAPS_API_KEY) {
    console.warn("Geocoding skipped: missing address or API key");
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        address: data.results[0].formatted_address,
      };
    }

    console.warn(`No geocoding results for address: ${address}`);
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export async function geocodeAddresses(
  pickup: string,
  dropoff: string
): Promise<{
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
} | null> {
  try {
    const [pickupResult, dropoffResult] = await Promise.all([
      geocodeAddress(pickup),
      geocodeAddress(dropoff),
    ]);

    if (!pickupResult || !dropoffResult) {
      console.warn("Failed to geocode one or both addresses");
      return null;
    }

    return {
      pickupLat: pickupResult.lat,
      pickupLng: pickupResult.lng,
      dropoffLat: dropoffResult.lat,
      dropoffLng: dropoffResult.lng,
    };
  } catch (error) {
    console.error("Batch geocoding error:", error);
    return null;
  }
}
