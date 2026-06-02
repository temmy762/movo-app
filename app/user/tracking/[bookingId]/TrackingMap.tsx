"use client";

import { useEffect, useRef } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

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

export default function TrackingMap({
  driverLat,
  driverLng,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  driverHeading = 0,
}: TrackingMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (mapRef.current && driverLat && driverLng) {
      mapRef.current.panTo({ lat: driverLat, lng: driverLng });
    }
  }, [driverLat, driverLng]);

  if (!isLoaded) {
    return <div className="w-full h-96 bg-gray-200 rounded-lg" />;
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

      {/* Driver marker (car icon) */}
      {driverLat && driverLng && (
        <Marker
          position={{ lat: driverLat, lng: driverLng }}
          title="Your Driver"
          icon={{
            url: `data:image/svg+xml;charset=UTF-8,${CAR_ICON}`,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
            rotation: driverHeading,
          }}
        />
      )}
    </GoogleMap>
  );
}
