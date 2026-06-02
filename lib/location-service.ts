export interface LocationUpdate {
  bookingId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

export async function publishLocation(
  token: string,
  location: LocationUpdate
): Promise<boolean> {
  try {
    const response = await fetch("/api/trips/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...location,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Location publish failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Location publish error:", error);
    return false;
  }
}

export async function startLocationTracking(
  bookingId: string,
  token: string,
  onLocationUpdate?: (location: LocationUpdate) => void,
  onError?: (error: string) => void
): Promise<() => void> {
  let watchId: number | null = null;

  if (!navigator.geolocation) {
    const error = "Geolocation not supported";
    console.error(error);
    onError?.(error);
    return () => {};
  }

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, heading, speed, accuracy } = position.coords;

      const location: LocationUpdate = {
        bookingId,
        lat: latitude,
        lng: longitude,
        heading: heading ?? undefined,
        speed: speed ?? undefined,
        accuracy: accuracy ?? undefined,
      };

      // Publish to server
      const success = await publishLocation(token, location);

      if (success) {
        onLocationUpdate?.(location);
      }
    },
    (error) => {
      const errorMessage = `Geolocation error: ${error.message}`;
      console.error(errorMessage);
      onError?.(errorMessage);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );

  // Return cleanup function
  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}
