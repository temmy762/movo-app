"use client";

import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";
import { useMemo, useEffect, useRef, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const CAR_ICON_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="20" fill="#131936" opacity="0.9"/>
    <path d="M11 19l2-6h14l2 6M9 19h22v8H9zM13 27v2M27 27v2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <circle cx="14" cy="27" r="2" fill="white"/>
    <circle cx="26" cy="27" r="2" fill="white"/>
  </svg>`
);

const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 }; /* Toronto */

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
];

interface Props {
  position:  { lat: number; lng: number } | null;
  /** pickup address — show route driver→pickup when provided */
  pickup?:   string;
  /** dropoff address — show route pickup→dropoff once ride started */
  dropoff?:  string;
  /** "accepted" | "arrived" → route to pickup; "started" → route to dropoff */
  navPhase?: "accepted" | "arrived" | "started" | string;
  /** called with live ETA text whenever directions are refreshed */
  onEta?:    (text: string) => void;
}

const PICKUP_PIN = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <circle cx="14" cy="14" r="14" fill="#4f46e5"/>
    <text x="14" y="19" font-family="sans-serif" font-size="11" font-weight="900" fill="white" text-anchor="middle">P</text>
    <polygon points="7,26 21,26 14,36" fill="#4f46e5"/>
  </svg>`
);
const DEST_PIN = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <circle cx="14" cy="14" r="14" fill="#C6BFB2"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
    <polygon points="7,26 21,26 14,36" fill="#C6BFB2"/>
  </svg>`
);

export default function DriverMap({ position, pickup, dropoff, navPhase, onEta }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [navDirections, setNavDirections] = useState<google.maps.DirectionsResult | null>(null);
  const mapRef      = useRef<google.maps.Map | null>(null);
  const etaThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const center = useMemo(
    () => position ?? DEFAULT_CENTER,
    [position?.lat, position?.lng] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const carIcon = useMemo(() => ({
    url: `data:image/svg+xml,${CAR_ICON_SVG}`,
    scaledSize: isLoaded ? new window.google.maps.Size(40, 40) : undefined,
    anchor:     isLoaded ? new window.google.maps.Point(20, 20) : undefined,
  }), [isLoaded]);

  const pickupIcon = useMemo(() => isLoaded ? {
    url: `data:image/svg+xml;charset=UTF-8,${PICKUP_PIN}`,
    scaledSize: new window.google.maps.Size(28, 36),
    anchor:     new window.google.maps.Point(14, 36),
  } : undefined, [isLoaded]);

  const destIcon = useMemo(() => isLoaded ? {
    url: `data:image/svg+xml;charset=UTF-8,${DEST_PIN}`,
    scaledSize: new window.google.maps.Size(28, 36),
    anchor:     new window.google.maps.Point(14, 36),
  } : undefined, [isLoaded]);

  /* Recalculate nav route when position or phase changes (throttled 10 s) */
  useEffect(() => {
    if (!isLoaded || !position) return;
    const isActive = navPhase === "accepted" || navPhase === "arrived" || navPhase === "started";
    if (!isActive || !pickup) return;
    if (etaThrottle.current) return;

    const destination = navPhase === "started" ? (dropoff || pickup) : pickup;

    const svc = new google.maps.DirectionsService();
    svc.route(
      { origin: position, destination, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === "OK" && result) {
          setNavDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg?.duration && onEta) onEta(leg.duration.text);
        }
      }
    );

    etaThrottle.current = setTimeout(() => { etaThrottle.current = null; }, 10000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, position?.lat, position?.lng, navPhase, pickup, dropoff]);

  /* Pan map to driver */
  useEffect(() => {
    if (mapRef.current && position) mapRef.current.panTo(position);
  }, [position]);

  /* Clear route when not in a nav phase */
  useEffect(() => {
    const active = navPhase === "accepted" || navPhase === "arrived" || navPhase === "started";
    if (!active) setNavDirections(null);
  }, [navPhase]);

  if (!isLoaded || !API_KEY) {
    return <div className="absolute inset-0" style={{ background: "#1a1e3c" }} />;
  }

  return (
    <div className="absolute inset-0">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={position ? 15 : 12}
        onLoad={map => { mapRef.current = map; }}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          styles: MAP_STYLES,
          clickableIcons: false,
        }}
      >
        {navDirections && (
          <DirectionsRenderer
            directions={navDirections}
            options={{
              suppressMarkers: true,
              polylineOptions: { strokeColor: "#4f46e5", strokeWeight: 5, strokeOpacity: 0.9 },
            }}
          />
        )}

        {position && <Marker position={position} icon={carIcon} />}

        {/* Pickup pin */}
        {navDirections && (navPhase === "accepted" || navPhase === "arrived") && pickupIcon && (
          <Marker position={navDirections.routes[0]?.legs[0]?.end_location ?? center} icon={pickupIcon} />
        )}

        {/* Destination pin */}
        {navDirections && navPhase === "started" && destIcon && (
          <Marker position={navDirections.routes[0]?.legs[0]?.end_location ?? center} icon={destIcon} />
        )}
      </GoogleMap>
    </div>
  );
}
