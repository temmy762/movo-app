"use client";

/* Add up to 3 stop addresses before booking. Each change re-prices the trip
   on the real route (pickup → stops → destination) and the updated fare is
   shown before the customer pays. */

import { useRef, useState } from "react";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/* Must match the pickup page's loader options exactly (same loader id) */
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];
const MAX_STOPS = 3;

export default function StopsEditor({ stops, onChange, disabled }: {
  stops: string[];
  onChange: (stops: string[]) => void;
  disabled?: boolean;
}) {
  const { isLoaded } = useJsApiLoader({ id: "movo-google-maps", googleMapsApiKey: API_KEY, libraries: LIBRARIES });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);

  const add = (address: string) => {
    const a = address.trim();
    if (!a || stops.length >= MAX_STOPS) return;
    onChange([...stops, a]);
    setDraft("");
    setAdding(false);
  };

  const input = (
    <input value={draft} onChange={e => setDraft(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }}
      placeholder="Stop address" autoFocus
      className="w-full bg-transparent text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none" />
  );

  return (
    <div className="mt-3 ml-7">
      {stops.map((s, i) => (
        <div key={`${s}-${i}`} className="flex items-start gap-2 mb-2">
          <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
          <p className="flex-1 text-[13px] text-gray-800 break-words">{s}</p>
          <button type="button" disabled={disabled} onClick={() => onChange(stops.filter((_, j) => j !== i))}
            className="no-hover-fx text-[12px] text-gray-400 hover:text-red-500 shrink-0">Remove</button>
        </div>
      ))}

      {adding ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-gray-300 px-3 py-2">
            {isLoaded ? (
              <Autocomplete onLoad={a => { autoRef.current = a; }}
                onPlaceChanged={() => {
                  const pl = autoRef.current?.getPlace();
                  add(pl?.formatted_address || pl?.name || draft);
                }}>
                {input}
              </Autocomplete>
            ) : input}
          </div>
          <button type="button" onClick={() => add(draft)} disabled={!draft.trim()}
            className="no-hover-fx px-3 py-2 rounded-xl text-white text-[12px] font-bold disabled:opacity-50" style={{ background: "#131936" }}>
            Add
          </button>
          <button type="button" onClick={() => { setAdding(false); setDraft(""); }}
            className="no-hover-fx text-[12px] text-gray-400">Cancel</button>
        </div>
      ) : stops.length < MAX_STOPS && (
        <button type="button" disabled={disabled} onClick={() => setAdding(true)}
          className="no-hover-fx flex items-center gap-1.5 text-[12px] font-semibold disabled:opacity-50"
          style={{ color: "#131936" }}>
          <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[11px] leading-none">+</span>
          Add a stop
        </button>
      )}
      {stops.length > 0 && (
        <p className="text-[11px] text-gray-400 mt-1.5">Your fare below includes the route through your stops.</p>
      )}
    </div>
  );
}
