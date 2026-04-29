"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const currentIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;background:#4f46e5;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #4f46e5"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const destinationIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:28px;height:28px;background:#8B7500;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center">
      <div style="width:9px;height:9px;background:white;border-radius:50%;transform:rotate(45deg)"></div>
    </div>
  </div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 32],
});

function Resizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface MiniMapProps {
  lat?: number;
  lng?: number;
  selectedPoint?: { lat: number; lng: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function MiniMap({ lat = 43.6532, lng = -79.3832, selectedPoint, onLocationSelect }: MiniMapProps) {
  const interactive = !!onLocationSelect;
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      scrollWheelZoom={false}
      zoomControl={false}
      doubleClickZoom={false}
      dragging={interactive}
      touchZoom={interactive}
      boxZoom={false}
      keyboard={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", cursor: interactive ? "crosshair" : "default" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Resizer />
      {onLocationSelect && <ClickHandler onPick={onLocationSelect} />}
      <Marker position={[lat, lng]} icon={currentIcon} />
      {selectedPoint && (
        <Marker position={[selectedPoint.lat, selectedPoint.lng]} icon={destinationIcon} />
      )}
    </MapContainer>
  );
}
