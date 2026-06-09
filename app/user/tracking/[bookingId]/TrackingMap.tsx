"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Validate API key exists
if (!API_KEY) {
  console.error("Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.");
}

const CAR_ICON = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="16" fill="#ef4444" opacity="0.2"/>
    <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="2"/>
    <path d="M8 14l1-3h14l1 3M7 14h18v5H7zM10 19v2M22 19v2" stroke="white" stroke-width="1.5" fill="none"/>
  </svg>`
);

interface TrackingMapProps {
  driverLat: number;
  driverLng: number;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  driverHeading?: number;
}

interface AnimationState {
  currentLat: number;
  currentLng: number;
  currentHeading: number;
  targetLat: number;
  targetLng: number;
  targetHeading: number;
  startTime: number;
  duration: number;
}

export default function TrackingMap({
  driverLat,
  driverLng,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  driverHeading = 0,
}: TrackingMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const animationRef = useRef<AnimationState>({
    currentLat: driverLat,
    currentLng: driverLng,
    currentHeading: driverHeading,
    targetLat: driverLat,
    targetLng: driverLng,
    targetHeading: driverHeading,
    startTime: 0,
    duration: 4500, // 4.5 seconds (leaves 0.5s buffer before next update)
  });
  const animationFrameRef = useRef<number | null>(null);
  const [displayPosition, setDisplayPosition] = useState({
    lat: driverLat,
    lng: driverLng,
    heading: driverHeading,
  });

  // Smooth interpolation function (easing)
  const easeInOutQuad = (t: number): number => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  };

  // Interpolate heading smoothly (handles 360-degree wrapping)
  const interpolateHeading = (start: number, end: number, progress: number): number => {
    let diff = end - start;
    
    // Handle 360-degree wrapping
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }
    
    return (start + diff * progress) % 360;
  };

  // Animation loop using requestAnimationFrame
  const animate = (timestamp: number) => {
    const state = animationRef.current;

    if (state.startTime === 0) {
      state.startTime = timestamp;
    }

    const elapsed = timestamp - state.startTime;
    const progress = Math.min(elapsed / state.duration, 1);
    const easedProgress = easeInOutQuad(progress);

    // Interpolate position
    const newLat = state.currentLat + (state.targetLat - state.currentLat) * easedProgress;
    const newLng = state.currentLng + (state.targetLng - state.currentLng) * easedProgress;
    const newHeading = interpolateHeading(state.currentHeading, state.targetHeading, easedProgress);

    // Update display state
    setDisplayPosition({
      lat: newLat,
      lng: newLng,
      heading: newHeading,
    });

    // Pan map to follow driver (smooth)
    if (mapRef.current) {
      mapRef.current.panTo({ lat: newLat, lng: newLng });
    }

    // Continue animation if not complete
    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete
      state.currentLat = state.targetLat;
      state.currentLng = state.targetLng;
      state.currentHeading = state.targetHeading;
      state.startTime = 0;
      animationFrameRef.current = null;
    }
  };

  // Update animation target when new position received
  useEffect(() => {
    const state = animationRef.current;

    // Only animate if position actually changed
    if (state.targetLat !== driverLat || state.targetLng !== driverLng) {
      state.targetLat = driverLat;
      state.targetLng = driverLng;
      state.targetHeading = driverHeading;
      state.startTime = 0; // Reset animation

      // Start animation if not already running
      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    }
  }, [driverLat, driverLng, driverHeading]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (loadError) {
    console.error("Google Maps API Error:", loadError);
    return (
      <div className="w-full h-96 bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Map Loading Error</p>
          <p className="text-red-500 text-sm">
            {loadError.message || "Failed to load Google Maps. Please check your API key configuration."}
          </p>
          <p className="text-gray-500 text-xs mt-2">Error details logged to console.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "400px" }}
      center={{ lat: driverLat || pickupLat, lng: driverLng || pickupLng }}
      zoom={15}
      onLoad={(map) => {
        mapRef.current = map;
      }}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      }}
    >
      {/* Route line from driver to destination */}
      {driverLat && driverLng && dropoffLat && dropoffLng && (
        <Polyline
          path={[
            { lat: driverLat, lng: driverLng },
            { lat: dropoffLat, lng: dropoffLng },
          ]}
          options={{
            strokeColor: "#3b82f6",
            strokeWeight: 3,
            strokeOpacity: 0.7,
            geodesic: true,
          }}
        />
      )}

      {/* Pickup marker (green) */}
      <Marker
        position={{ lat: pickupLat, lng: pickupLng }}
        title="Pickup Location"
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#10b981",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        }}
      />

      {/* Dropoff marker (red) */}
      <Marker
        position={{ lat: dropoffLat, lng: dropoffLng }}
        title="Destination"
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        }}
      />

      {/* Driver marker (car icon) - uses animated position */}
      {displayPosition.lat && displayPosition.lng && (
        <Marker
          position={{ lat: displayPosition.lat, lng: displayPosition.lng }}
          title="Your Driver"
          icon={{
            url: `data:image/svg+xml;charset=UTF-8,${CAR_ICON}`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
            rotation: displayPosition.heading,
          }}
        />
      )}
    </GoogleMap>
  );
}
