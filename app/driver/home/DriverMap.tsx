"use client";

import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from "@react-google-maps/api";
import { useMemo, useEffect, useRef, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

/* Top-down car drawn pointing NORTH (heading 0°) so a rotate(heading) transform
   aligns it with the direction of travel. */
function carIconSvg(headingDeg: number): string {
  return encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="20" fill="#131936" opacity="0.9"/>
      <g transform="rotate(${headingDeg.toFixed(0)} 20 20)">
        <rect x="14" y="8" width="12" height="22" rx="4.5" fill="white"/>
        <rect x="16" y="12" width="8" height="5" rx="1.5" fill="#131936"/>
        <rect x="16" y="22" width="8" height="4" rx="1.5" fill="#131936"/>
        <polygon points="20,4 23.5,9.5 16.5,9.5" fill="#C6BFB2"/>
      </g>
    </svg>`
  );
}

const DEFAULT_CENTER = { lat: 49.8951, lng: -97.1384 }; /* Winnipeg */

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
];

/* Night-mode styling matching the dark chauffeur dashboard (same palette as the
   rider tracking map). */
const DARK_STYLES = [
  { elementType: "geometry",           stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#8a8a9a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "road",              elementType: "geometry",         stylers: [{ color: "#2c2c44" }] },
  { featureType: "road",              elementType: "geometry.stroke",  stylers: [{ color: "#12121f" }] },
  { featureType: "road",              elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway",      elementType: "geometry",         stylers: [{ color: "#3a3a58" }] },
  { featureType: "road.highway",      elementType: "geometry.stroke",  stylers: [{ color: "#1a1a2e" }] },
  { featureType: "water",             elementType: "geometry",         stylers: [{ color: "#0e1a2e" }] },
  { featureType: "poi",               stylers: [{ visibility: "off" }] },
  { featureType: "transit",           stylers: [{ visibility: "off" }] },
];

interface Props {
  position:  { lat: number; lng: number } | null;
  /** rider's live position (pickup phase) — shown as a pulsing person marker */
  riderPosition?: { lat: number; lng: number } | null;
  /** pickup address — show route driver→pickup when provided */
  pickup?:   string;
  /** dropoff address — show route pickup→dropoff once ride started */
  dropoff?:  string;
  /** "accepted" | "arrived" → route to pickup; "started" → route to dropoff */
  navPhase?: "accepted" | "arrived" | "started" | string;
  /** called with live ETA text whenever directions are refreshed */
  onEta?:    (text: string) => void;
  /** night-mode map styling to match the dark dashboard */
  darkTheme?: boolean;
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

/* Rider's live position — pulsing person marker */
const RIDER_PIN = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="16" fill="#4f46e5" opacity="0.25"/>
    <circle cx="17" cy="17" r="10" fill="#4f46e5"/>
    <circle cx="17" cy="13.5" r="3" fill="white"/>
    <path d="M11 23c0-3 2.7-5 6-5s6 2 6 5" fill="white"/>
  </svg>`
);

/* Smoothly animate a marker between position updates instead of jumping —
   gives the "vehicle gliding along the route" feel of modern ride apps. */
function useAnimatedPosition(target: { lat: number; lng: number } | null, durationMs = 900) {
  const [animated, setAnimated] = useState<{ lat: number; lng: number } | null>(target);
  const fromRef  = useRef<{ lat: number; lng: number } | null>(target);
  const rafRef   = useRef<number | null>(null);

  useEffect(() => {
    if (!target) { setAnimated(null); fromRef.current = null; return; }
    const from = fromRef.current;
    if (!from) { setAnimated(target); fromRef.current = target; return; }
    if (from.lat === target.lat && from.lng === target.lng) return;

    const start = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const e = 1 - Math.pow(1 - t, 2); /* ease-out */
      const cur = {
        lat: from.lat + (target.lat - from.lat) * e,
        lng: from.lng + (target.lng - from.lng) * e,
      };
      setAnimated(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng, durationMs]);

  return animated;
}

export default function DriverMap({ position, riderPosition, pickup, dropoff, navPhase, onEta, darkTheme }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [navDirections, setNavDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [heading,       setHeading]       = useState(0);
  const mapRef      = useRef<google.maps.Map | null>(null);
  const etaThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPosRef  = useRef<{ lat: number; lng: number } | null>(null);

  /* Smooth marker motion between GPS updates */
  const animatedPos      = useAnimatedPosition(position);
  const animatedRiderPos = useAnimatedPosition(riderPosition ?? null);

  const center = useMemo(
    () => position ?? DEFAULT_CENTER,
    [position?.lat, position?.lng] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* Rotate the car marker to face the direction of travel */
  useEffect(() => {
    if (!isLoaded || !position) return;
    const prev = prevPosRef.current;
    prevPosRef.current = position;
    if (!prev || (prev.lat === position.lat && prev.lng === position.lng)) return;
    if (window.google?.maps?.geometry?.spherical) {
      const h = window.google.maps.geometry.spherical.computeHeading(
        new window.google.maps.LatLng(prev.lat, prev.lng),
        new window.google.maps.LatLng(position.lat, position.lng),
      );
      setHeading(((h % 360) + 360) % 360);
    }
  }, [isLoaded, position]);

  const carIcon = useMemo(() => ({
    url: `data:image/svg+xml;charset=UTF-8,${carIconSvg(heading)}`,
    scaledSize: isLoaded ? new window.google.maps.Size(40, 40) : undefined,
    anchor:     isLoaded ? new window.google.maps.Point(20, 20) : undefined,
  }), [isLoaded, heading]);

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

  const riderIcon = useMemo(() => isLoaded ? {
    url: `data:image/svg+xml;charset=UTF-8,${RIDER_PIN}`,
    scaledSize: new window.google.maps.Size(34, 34),
    anchor:     new window.google.maps.Point(17, 17),
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
          styles: darkTheme ? DARK_STYLES : MAP_STYLES,
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

        {animatedPos && <Marker position={animatedPos} icon={carIcon} />}

        {/* Rider's live position — pickup phase only (they're in the car after) */}
        {animatedRiderPos && (navPhase === "accepted" || navPhase === "arrived") && riderIcon && (
          <Marker position={animatedRiderPos} icon={riderIcon} zIndex={5} />
        )}

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
