/* What the chauffeur needs at pickup: rider contact (the rider may not be the
   account holder), passengers, pickup instructions, stops and — for Safe Ride —
   the customer's own vehicle. */

type Vehicle = { make?: string; model?: string; year?: string; colour?: string; plate?: string; transmission?: string };

export type RideDetailsBooking = {
  clientName: string;
  bookingNumber?: string | null;
  riderPhone?: string | null;
  user?: { phone: string | null } | null;
  passengers?: number | null;
  pickupInstructions?: string | null;
  stops?: unknown;
  careVehicle?: unknown;
};

export default function RideDetails({ booking }: { booking: RideDetailsBooking }) {
  const phone = booking.riderPhone || booking.user?.phone || null;
  const stops = Array.isArray(booking.stops) ? (booking.stops as string[]) : [];
  const v = (booking.careVehicle ?? null) as Vehicle | null;

  if (!booking.bookingNumber && !phone && !booking.passengers && !booking.pickupInstructions && !stops.length && !v) return null;

  return (
    <div className="flex flex-col gap-2 mb-3 rounded-xl bg-gray-50 px-3 py-2.5 text-[12px]">
      {booking.bookingNumber && (
        <p className="text-gray-500">Booking · <span className="font-mono text-gray-800 font-semibold">{booking.bookingNumber}</span></p>
      )}
      {phone && (
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Rider · <span className="text-gray-800 font-semibold">{booking.clientName}</span></span>
          <a href={`tel:${phone}`} className="no-hover-fx flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            Call
          </a>
        </div>
      )}
      {!!booking.passengers && <p className="text-gray-500">Passengers · <span className="text-gray-800 font-semibold">{booking.passengers}</span></p>}
      {v && (
        <p className="text-gray-500">
          Vehicle · <span className="text-gray-800 font-semibold">{[v.colour, v.year, v.make, v.model].filter(Boolean).join(" ")}</span>
          {v.plate ? <> · <span className="font-mono text-gray-800">{v.plate}</span></> : null}
          {v.transmission ? <> · {v.transmission}</> : null}
        </p>
      )}
      {booking.pickupInstructions && (
        <p className="text-gray-500">Pickup note · <span className="text-gray-800">{booking.pickupInstructions}</span></p>
      )}
      {stops.length > 0 && (
        <div className="text-gray-500">
          Stops:
          <ol className="list-decimal ml-5 text-gray-800">
            {stops.map((s, i) => <li key={`${i}-${s}`}>{s}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
