"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";

const carIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.7))">
    <img src="/images/Car.png" style="width:52px;height:auto;" alt="car" />
  </div>`,
  iconSize: [52, 30],
  iconAnchor: [26, 15],
});

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="width:30px;height:30px;background:#4f46e5;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:white;font-family:sans-serif">P</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const destIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:28px;height:28px;background:#8B7500;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center">
      <div style="width:9px;height:9px;background:white;border-radius:50%;transform:rotate(45deg)"></div>
    </div>
  </div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 32],
});

const PICKUP: [number, number] = [43.662, -79.393];
const CAR: [number, number] = [43.655, -79.385];
const DEST: [number, number] = [43.644, -79.372];

function Resizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function RideMap() {
  return (
    <MapContainer
      center={[43.653, -79.382]}
      zoom={13}
      zoomControl={true}
      scrollWheelZoom={false}
      dragging={true}
      touchZoom={true}
      doubleClickZoom={false}
      keyboard={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Resizer />
      <Marker position={PICKUP} icon={pickupIcon} />
      <Marker position={CAR} icon={carIcon} />
      <Marker position={DEST} icon={destIcon} />
    </MapContainer>
  );
}
