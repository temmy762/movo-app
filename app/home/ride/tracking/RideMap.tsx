"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

/* Top-down car drawn pointing NORTH (heading 0°) so a rotate(heading) transform
   aligns it with the direction of travel. */
function carSvg(headingDeg: number): string {
  return encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <g transform="rotate(${headingDeg.toFixed(0)} 22 22)">
        <rect x="14" y="8" width="16" height="28" rx="6" fill="#131936" stroke="#C6BFB2" stroke-width="1.5"/>
        <rect x="16.5" y="13" width="11" height="7" rx="2" fill="#3b4a7a"/>
        <rect x="16.5" y="26" width="11" height="5" rx="2" fill="#3b4a7a"/>
        <polygon points="22,3 26,10 18,10" fill="#C6BFB2"/>
      </g>
    </svg>`
  );
}

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
  /** false/undefined: driver is heading to the PICKUP. true: trip in progress,
      route + ETA should target the DROPOFF destination instead. */
  tripStarted?: boolean;
  onDirectionsFetched?: (durationText: string, durationSeconds: number) => void;
}

/* Smoothly animate the car between position updates instead of jumping — the
   updates arrive every few seconds, so gliding between them reads as live
   movement like modern ride-hailing apps. */
function useAnimatedPosition(target: { lat: number; lng: number } | null, durationMs = 1800) {
  const [animated, setAnimated] = useState<{ lat: number; lng: number } | null>(target);
  const fromRef = useRef<{ lat: number; lng: number } | null>(target);
  const rafRef  = useRef<number | null>(null);

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
      setAnimated({
        lat: from.lat + (target.lat - from.lat) * e,
        lng: from.lng + (target.lng - from.lng) * e,
      });
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng, durationMs]);

  return animated;
}

export default function RideMap({ pickup, dropoff, driverPosition, tripStarted, onDirectionsFetched }: RideMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "movo-google-maps",
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [directions,  setDirections]  = useState<google.maps.DirectionsResult | null>(null);
  const [pickupPos,   setPickupPos]   = useState<google.maps.LatLngLiteral>(DEFAULT_PICKUP);
  const [destPos,     setDestPos]     = useState<google.maps.LatLngLiteral>(DEFAULT_DEST);
  const [heading,     setHeading]     = useState(0);
  const mapRef        = useRef<google.maps.Map | null>(null);
  const etaTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEtaRef    = useRef<string>("");
  const prevPosRef    = useRef<{ lat: number; lng: number } | null>(null);

  /* Glide the car between updates instead of teleporting */
  const animatedDriverPos = useAnimatedPosition(driverPosition ?? null);

  /* Resolve and cache pickup/dropoff coords on first load */
  useEffect(() => {
    if (!isLoaded) return;
    const svc = new google.maps.DirectionsService();
    svc.route(
      { origin: pickup || DEFAULT_PICKUP, destination: dropoff || DEFAULT_DEST, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === "OK" && result) {
          const leg = result.routes[0]?.legs[0];
          if (leg?.start_location) setPickupPos({ lat: leg.start_location.lat(), lng: leg.start_location.lng() });
          if (leg?.end_location)   setDestPos({ lat: leg.end_location.lat(), lng: leg.end_location.lng() });
        }
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, pickup, dropoff]);

  /* Rotate the car marker to face the direction of travel */
  useEffect(() => {
    if (!isLoaded || !driverPosition) return;
    const prev = prevPosRef.current;
    prevPosRef.current = driverPosition;
    if (!prev || (prev.lat === driverPosition.lat && prev.lng === driverPosition.lng)) return;
    if (typeof google !== "undefined" && google.maps.geometry?.spherical) {
      const h = google.maps.geometry.spherical.computeHeading(
        new google.maps.LatLng(prev.lat, prev.lng),
        new google.maps.LatLng(driverPosition.lat, driverPosition.lng),
      );
      setHeading(((h % 360) + 360) % 360);
    }
  }, [isLoaded, driverPosition]);

  /* Phase flip (en route → trip started): force an immediate re-route to the new target */
  useEffect(() => {
    if (etaTimerRef.current) { clearTimeout(etaTimerRef.current); etaTimerRef.current = null; }
    lastEtaRef.current = "";
  }, [tripStarted]);

  /* Re-route from driver position every time it updates (throttled 10s).
     Target: pickup while the chauffeur is en route, dropoff once the trip started. */
  const recalcRoute = useCallback(() => {
    if (!isLoaded || !driverPosition) return;
    if (etaTimerRef.current) return; // already scheduled
    const destination = tripStarted ? (dropoff || DEFAULT_DEST) : (pickup || DEFAULT_PICKUP);
    const svc = new google.maps.DirectionsService();
    svc.route(
      { origin: driverPosition, destination, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg?.duration) {
            const etaLabel = leg.duration.text;
            if (etaLabel !== lastEtaRef.current) {
              lastEtaRef.current = etaLabel;
              onDirectionsFetched?.(etaLabel, leg.duration.value);
            }
          }
        }
      }
    );
    /* throttle recalc to once per 10s */
    etaTimerRef.current = setTimeout(() => { etaTimerRef.current = null; }, 10000);
  }, [isLoaded, driverPosition, pickup, dropoff, tripStarted, onDirectionsFetched]);

  useEffect(() => { recalcRoute(); }, [recalcRoute]);

  /* Auto-pan map to keep driver in view */
  useEffect(() => {
    if (!mapRef.current || !driverPosition) return;
    mapRef.current.panTo(driverPosition);
  }, [driverPosition]);

  const mapCenter = driverPosition ?? pickupPos;

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
      zoom={driverPosition ? 15 : 13}
      onLoad={map => { mapRef.current = map; }}
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

      {/* Car marker — live driver position, animated between updates and
          rotated to the direction of travel */}
      <Marker
        position={animatedDriverPos ?? driverPosition ?? mapCenter}
        icon={{
          url: `data:image/svg+xml;charset=UTF-8,${carSvg(heading)}`,
          scaledSize: new google.maps.Size(44, 44),
          anchor: new google.maps.Point(22, 22),
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
