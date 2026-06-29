"use client";

import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

const carImages: Record<string, string> = {
  classic: "/images/movo classic.png",
  premium: "/images/movo premium.png",
  black: "/images/prive black.png",
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: "#fef9c3", text: "#854d0e", label: "Pending"   },
  CONFIRMED: { bg: "#dbeafe", text: "#1d4ed8", label: "Confirmed" },
  COMPLETED: { bg: "#dcfce7", text: "#15803d", label: "Completed" },
  CANCELLED: { bg: "#fee2e2", text: "#dc2626", label: "Cancelled" },
};

interface BookingDetail {
  id: string;
  carName: string;
  carTier: string;
  pickup: string;
  dropoff: string;
  fare: number;
  serviceFee: number;
  gst?: number;
  additionalStopFee?: number;
  airportFee?: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  driver?: {
    firstName: string;
    lastName: string;
    phone: string | null;
    avgRating: number | null;
    vehicle?: {
      make: string;
      model: string;
      year: number;
      plate: string;
      tier: string;
      photoUrl: string | null;
    } | null;
  } | null;
}

function BookingDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/bookings/${id}`)
      .then(r => (r.ok ? r.json() : Promise.reject("not found")))
      .then(setBooking)
      .catch(() => setError("Booking not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const status = booking ? (statusColors[booking.status] ?? { bg: "#f3f4f6", text: "#6b7280", label: booking.status }) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center px-5 py-4 relative">
        <button type="button" onClick={() => router.back()} className="absolute left-5 no-hover-fx" aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold text-gray-900">Booking Details</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-gray-200 border-t-[#131936] rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-20 px-8 text-center">
            <p className="text-[14px] text-gray-500">{error}</p>
          </div>
        )}

        {booking && status && (
          <div className="w-full max-w-lg md:max-w-2xl mx-auto px-4 pt-5 flex flex-col gap-4">

            {/* Ticket card */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              {/* Top: car image + status */}
              <div
                className="relative h-36 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 60%, #2A3055 100%)" }}
              >
                <div className="relative w-48 h-28">
                  <Image
                    src={carImages[booking.carTier] ?? "/images/movo classic.png"}
                    alt={booking.carName}
                    fill
                    className="object-contain drop-shadow-xl"
                    unoptimized
                  />
                </div>
                <span
                  className="absolute top-3 right-3 text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{ background: status.bg, color: status.text }}
                >
                  {status.label}
                </span>
              </div>

              {/* Booking ID + car name */}
              <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                <p className="text-[18px] font-bold text-gray-900">{booking.carName}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">#{booking.id.slice(-8).toUpperCase()}</p>
              </div>

              {/* Route */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="relative flex flex-col gap-3">
                  <div className="absolute left-[7px] top-[16px] bottom-[16px] w-px bg-gray-200" />
                  <div className="flex items-start gap-3">
                    <div className="w-[14px] h-[14px] rounded-full shrink-0 mt-0.5 z-10" style={{ background: "#131936" }} />
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">PICKUP</p>
                      <p className="text-[13px] font-semibold text-gray-800 leading-snug">{booking.pickup}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-[14px] h-[14px] rounded-full bg-red-500 shrink-0 mt-0.5 z-10" />
                    <div>
                      <p className="text-[11px] text-gray-400 font-medium">DROP-OFF</p>
                      <p className="text-[13px] font-semibold text-gray-800 leading-snug">{booking.dropoff}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fare breakdown */}
              <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-2">
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fare Breakdown</p>
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-600">Ride Fare</span>
                  <span className="font-semibold text-gray-900">${booking.fare.toFixed(2)}</span>
                </div>
                {(booking.additionalStopFee ?? 0) > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-600">Additional Stop Fee</span>
                    <span className="font-semibold text-gray-900">+${booking.additionalStopFee!.toFixed(2)}</span>
                  </div>
                )}
                {(booking.airportFee ?? 0) > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-600">Airport Pickup Fee</span>
                    <span className="font-semibold text-gray-900">+${booking.airportFee!.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="font-semibold text-gray-900">${booking.serviceFee.toFixed(2)}</span>
                </div>
                {(booking.gst ?? 0) > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-600">GST</span>
                    <span className="font-semibold text-gray-900">${booking.gst!.toFixed(2)}</span>
                  </div>
                )}
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex justify-between">
                  <span className="text-[14px] font-bold text-gray-900">Total</span>
                  <span className="text-[14px] font-bold text-gray-900">${booking.total.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Payment: <span className="font-semibold capitalize">{booking.paymentStatus.toLowerCase()}</span>
                </p>
              </div>

              {/* Timestamps */}
              <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-1.5">
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-1">Timeline</p>
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Booked</span>
                  <span className="font-medium text-gray-800">{new Date(booking.createdAt).toLocaleString()}</span>
                </div>
                {booking.startedAt && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Ride Started</span>
                    <span className="font-medium text-gray-800">{new Date(booking.startedAt).toLocaleString()}</span>
                  </div>
                )}
                {booking.completedAt && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Completed</span>
                    <span className="font-medium text-gray-800">{new Date(booking.completedAt).toLocaleString()}</span>
                  </div>
                )}
                {booking.cancelledAt && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-gray-500">Cancelled</span>
                    <span className="font-medium text-gray-800">{new Date(booking.cancelledAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Driver info (if assigned) */}
              {booking.driver && (
                <div className="px-5 py-4">
                  <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">Driver</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#131936] to-[#2A3055] flex items-center justify-center shrink-0">
                      <span className="text-white text-[16px] font-bold">
                        {booking.driver.firstName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-gray-900">
                        {booking.driver.firstName} {booking.driver.lastName}
                      </p>
                      {booking.driver.avgRating != null && (
                        <p className="text-[12px] font-semibold" style={{ color: "#f59e0b" }}>
                          ★ {booking.driver.avgRating.toFixed(1)}
                        </p>
                      )}
                    </div>
                    {booking.driver.vehicle && (
                      <div className="text-right">
                        <p className="text-[12px] font-semibold text-gray-700">
                          {booking.driver.vehicle.make} {booking.driver.vehicle.model}
                        </p>
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-gray-900 text-white tracking-widest font-mono mt-0.5">
                          {booking.driver.vehicle.plate}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {booking.status === "COMPLETED" && (
              <button
                type="button"
                onClick={() => router.push("/home/pickup")}
                className="w-full py-3.5 rounded-full text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
              >
                Book Again
              </button>
            )}
            {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
              <button
                type="button"
                onClick={() => router.push(`/home/ride/tracking?bookingId=${booking.id}&pickup=${encodeURIComponent(booking.pickup)}&dropoff=${encodeURIComponent(booking.dropoff)}&car=${encodeURIComponent(booking.carName)}&tier=${booking.carTier}`)}
                className="w-full py-3.5 rounded-full text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
              >
                Track Ride
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <Suspense>
      <BookingDetailContent />
    </Suspense>
  );
}
