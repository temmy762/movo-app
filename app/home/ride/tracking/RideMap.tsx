"use client";

import { useEffect, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const DEFAULT_PICKUP = { lat: 43.662, lng: -79.393 };
const DEFAULT_DEST   = { lat: 43.644, lng: -79.372 };

const PICKUP_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="15" fill="#4f46e5"/>
    <text x="15" y="20" font-family="sans-serif" font-size="13" font-weight="900" fill="white" text-anchor="middle">P</text>
  </svg>`
);

const DEST_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <circle cx="14" cy="14" r="14" fill="#C6BFB2"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
    <polygon points="7,26 21,26 14,36" fill="#C6BFB2"/>
  </svg>`
);

const DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",           stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#8a8a9a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "road",              elementType: "geometry",        stylers: [{ color: "#2c2c44" }] },
  { featureType: "road",              elementType: "geometry.stroke", stylers: [{ color: "#12121f" }] },
  { featureType: "road",              elementType: "labels.text.fill",stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway",      elementType: "geometry",        stylers: [{ color: "#3a3a58" }] },
  { featureType: "road.highway",      elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "water",             elementType: "geometry",        stylers: [{ color: "#0e1a2e" }] },
  { featureType: "poi",               stylers: [{ visibility: "off" }] },
  { featureType: "transit",           stylers: [{ visibility: "off" }] },
];

interface RideMapProps {
  pickup?: string;
  dropoff?: string;
  driverPosition?: { lat: number; lng: number } | null;
  onDirectionsFetched?: (durationText: string, durationSeconds: number) => void;
}

export default function RideMap({ pickup, dropoff, driverPosition, onDirectionsFetched }: RideMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [pickupPos, setPickupPos] = useState<google.maps.LatLngLiteral>(DEFAULT_PICKUP);
  const [destPos, setDestPos] = useState<google.maps.LatLngLiteral>(DEFAULT_DEST);

  useEffect(() => {
    if (!isLoaded) return;
    const svc = new google.maps.DirectionsService();
    const origin = pickup || DEFAULT_PICKUP;
    const destination = dropoff || DEFAULT_DEST;

    svc.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg?.start_location) {
            setPickupPos({ lat: leg.start_location.lat(), lng: leg.start_location.lng() });
          }
          if (leg?.end_location) {
            setDestPos({ lat: leg.end_location.lat(), lng: leg.end_location.lng() });
          }
          if (leg?.duration && onDirectionsFetched) {
            onDirectionsFetched(leg.duration.text, leg.duration.value);
          }
        }
      }
    );
  }, [isLoaded, pickup, dropoff]);

  const mapCenter = directions
    ? pickupPos
    : DEFAULT_PICKUP;

  if (!isLoaded) {
    return (
      <div style={{ width: "100%", height: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "white", fontSize: "13px" }}>Loading map…</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={mapCenter}
      zoom={13}
      options={{
        disableDefaultUI: true,
        zoomControl: false,
        clickableIcons: false,
        styles: DARK_STYLES,
      }}
    >
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#C6BFB2",
              strokeWeight: 5,
              strokeOpacity: 0.9,
            },
          }}
        />
      )}

      {/* Pickup marker */}
      <Marker
        position={pickupPos}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,${PICKUP_SVG}`,
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 15),
        }}
      />

      {/* Car marker — live driver position (falls back to pickup if no GPS yet) */}
      <Marker
        position={driverPosition ?? mapCenter}
        icon={{
          url: "/images/Car.png",
          scaledSize: new google.maps.Size(52, 30),
          anchor: new google.maps.Point(26, 15),
        }}
      />

      {/* Destination marker */}
      <Marker
        position={destPos}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,${DEST_SVG}`,
          scaledSize: new google.maps.Size(28, 36),
          anchor: new google.maps.Point(14, 36),
        }}
      />
    </GoogleMap>
  );
}
