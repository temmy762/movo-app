"use client";

/* Address field with Google Places suggestions. Selecting a suggestion calls
   onSelect with the full formatted address; Enter submits what's typed. */

import { useRef } from "react";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/* Must match the other pages' loader options exactly (same loader id) */
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

export default function AddressInput({ value, onChange, onSelect, placeholder, autoFocus, className }: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (address: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const { isLoaded } = useJsApiLoader({ id: "movo-google-maps", googleMapsApiKey: API_KEY, libraries: LIBRARIES });
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);

  const input = (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter" && onSelect) { e.preventDefault(); onSelect(value); } }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={className ?? "w-full bg-transparent text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none"}
    />
  );

  if (!isLoaded) return input;
  return (
    <Autocomplete
      onLoad={a => { autoRef.current = a; }}
      onPlaceChanged={() => {
        const pl = autoRef.current?.getPlace();
        const address = pl?.formatted_address || pl?.name || value;
        onChange(address);
        onSelect?.(address);
      }}
    >
      {input}
    </Autocomplete>
  );
}
