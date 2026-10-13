"use client";

/* Checkout: add up to 3 stops (with address suggestions) and drag them into
   travel order. Each change re-prices the trip on the real route
   (pickup → stops → destination); the updated fare is shown before paying. */

import { useState } from "react";
import AddressInput from "./AddressInput";
import RouteStops from "./RouteStops";

const MAX_STOPS = 3;

export default function StopsEditor({ pickup, dropoff, stops, onChange, disabled }: {
  pickup: string;
  dropoff: string;
  stops: string[];
  onChange: (stops: string[]) => void;
  disabled?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");

  const add = (address: string) => {
    const a = address.trim();
    if (!a || stops.length >= MAX_STOPS || stops.includes(a)) return;
    onChange([...stops, a]);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="mt-3">
      {stops.length > 0 && (
        <RouteStops
          pickup={pickup} stops={stops} dropoff={dropoff} disabled={disabled}
          onReorder={onChange}
          onRemove={i => onChange(stops.filter((_, j) => j !== i))}
        />
      )}

      {adding ? (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 rounded-xl border border-gray-300 px-3 py-2">
            <AddressInput value={draft} onChange={setDraft} onSelect={add} placeholder="Stop address" autoFocus />
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
          className="no-hover-fx flex items-center gap-1.5 mt-2 text-[12px] font-semibold disabled:opacity-50"
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
