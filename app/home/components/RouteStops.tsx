"use client";

/* The trip in travel order: pickup at the top, each stop as its own tab, the
   final destination at the bottom. Stops can be dragged (mouse or touch) to
   reorder them; pickup and destination stay fixed. */

import { useRef, useState } from "react";

function Pin({ color, label }: { color: string; label?: string }) {
  return (
    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white text-[9px] font-bold" style={{ background: color }}>
      {label}
    </span>
  );
}

export default function RouteStops({ pickup, stops, dropoff, onReorder, onRemove, disabled }: {
  pickup: string;
  stops: string[];
  dropoff: string;
  onReorder?: (stops: string[]) => void;
  onRemove?: (index: number) => void;
  disabled?: boolean;
}) {
  const [order, setOrder]       = useState<string[] | null>(null);  // live order while dragging
  const [dragIdx, setDragIdx]   = useState<number | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const list = order ?? stops;
  const canDrag = !!onReorder && !disabled && stops.length > 1;

  const onPointerDown = (i: number) => (e: React.PointerEvent) => {
    if (!canDrag) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setOrder([...stops]);
    setDragIdx(i);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragIdx === null || !order) return;
    /* Swap with the neighbour whose middle the pointer has crossed */
    const y = e.clientY;
    const above = rowRefs.current[dragIdx - 1]?.getBoundingClientRect();
    const below = rowRefs.current[dragIdx + 1]?.getBoundingClientRect();
    let to = dragIdx;
    if (above && y < above.top + above.height / 2) to = dragIdx - 1;
    else if (below && y > below.top + below.height / 2) to = dragIdx + 1;
    if (to !== dragIdx) {
      const next = [...order];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(to, 0, moved);
      setOrder(next);
      setDragIdx(to);
    }
  };

  const onPointerUp = () => {
    if (dragIdx === null) return;
    const finalOrder = order;
    setDragIdx(null);
    setOrder(null);
    if (finalOrder && finalOrder.join("\u0000") !== stops.join("\u0000")) onReorder?.(finalOrder);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
        <Pin color="#131936" />
        <p className="flex-1 text-[13px] text-gray-800 break-words">{pickup}</p>
      </div>

      {list.map((s, i) => (
        /* Key by address (not position) so the dragged row isn't re-created
           mid-drag, which would drop the pointer capture */
        <div key={s} ref={el => { rowRefs.current[i] = el; }}
          className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-shadow"
          style={dragIdx === i
            ? { borderColor: "#131936", background: "#f5f5f2", boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }
            : { borderColor: "#e5e7eb", background: "white" }}>
          {canDrag && (
            <span onPointerDown={onPointerDown(i)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
              className="cursor-grab active:cursor-grabbing text-gray-400 shrink-0 select-none" style={{ touchAction: "none" }}
              aria-label="Drag to reorder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
            </span>
          )}
          <Pin color="#d97706" label={String(i + 1)} />
          <p className="flex-1 text-[13px] text-gray-800 break-words">{s}</p>
          {onRemove && !disabled && (
            <button type="button" onClick={() => onRemove(i)} className="no-hover-fx text-[12px] text-gray-400 hover:text-red-500 shrink-0">Remove</button>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
        <Pin color="#ef4444" />
        <p className="flex-1 text-[13px] text-gray-800 break-words">{dropoff}</p>
      </div>
      {canDrag && <p className="text-[11px] text-gray-400">Drag the stops to change their order.</p>}
    </div>
  );
}
