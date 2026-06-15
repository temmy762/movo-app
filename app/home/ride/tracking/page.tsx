"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import SupportSheet from "./SupportSheet";

const RideMap = dynamic(() => import("./RideMap"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "white", fontSize: "13px" }}>Loading map…</span>
    </div>
  ),
});

function RideTrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickup    = searchParams.get("pickup")    || "";
  const dropoff   = searchParams.get("dropoff")   || "";
  const car       = searchParams.get("car")       || "Movo Classic";
  const tier      = searchParams.get("tier")      || "";
  const carImgParam = searchParams.get("carImg")  || "";
  const bookingId = searchParams.get("bookingId") || null;
  const paidFlag  = searchParams.get("paid");

  const [view, setView] = useState<"route" | "actions">("route");

  /* ── ETA / arrival ── */
  const [etaText,     setEtaText]     = useState("...");
  const [arrivalTime, setArrivalTime] = useState("...");

  /* ── Driver / vehicle info ── */
  const [driverName,     setDriverName]     = useState("Driver");
  const [driverRating,   setDriverRating]   = useState<number | null>(null);
  const [driverPhone,    setDriverPhone]    = useState<string | null>(null);
  const [vehicleSeats,   setVehicleSeats]   = useState<number>(4);
  const [vehicleImg,     setVehicleImg]     = useState<string>("");
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number } | null>(null);
  const locationPollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Modal states ── */
  const [showMessage,  setShowMessage]  = useState(false);
  const [messageText,  setMessageText]  = useState("");
  const [messageSent,  setMessageSent]  = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showAddStop,  setShowAddStop]  = useState(false);
  const [stopAddress,  setStopAddress]  = useState("");
  const [showSupport,       setShowSupport]       = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling,        setCancelling]        = useState(false);

  const TIER_IMAGES: Record<string, string> = {
    classic:  "/images/movo classic.png",
    premium:  "/images/movo premium.png",
    black:    "/images/prive black.png",
  };
  const TIER_LABELS: Record<string, string> = {
    classic:  "Movo Classic",
    premium:  "Movo Premium",
    black:    "Movo Privé Black",
  };
  const resolvedTier = tier.toLowerCase().replace(/ /g, "") === "firstclass" ? "black" : tier.toLowerCase();
  const carImg = vehicleImg || carImgParam || TIER_IMAGES[resolvedTier] || "/images/movo classic.png";
  const tierLabel = TIER_LABELS[resolvedTier] || tier || "";
  const dropoffCity = dropoff.split(",").slice(1, 3).join(",").trim();
  const driverInitial = driverName.charAt(0).toUpperCase() || "D";

  /* ── Guarantee PAID status (covers 3DS redirect case) ── */
  useEffect(() => {
    if (!bookingId || paidFlag !== "1") return;
    fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "PAID" }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch booking / driver details ── */
  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.driver) return;
        const name = `${data.driver.firstName} ${data.driver.lastName}`.trim();
        setDriverName(name || "Driver");
        if (data.driver.phone)              setDriverPhone(data.driver.phone);
        if (data.driver.avgRating != null)  setDriverRating(data.driver.avgRating);
        if (data.driver.vehicle?.photoUrl)  setVehicleImg(data.driver.vehicle.photoUrl);
      })
      .catch(() => {});
  }, [bookingId]);

  /* ── Live driver location polling ── */
  useEffect(() => {
    if (!bookingId) return;

    const poll = () => {
      fetch(`/api/bookings/${bookingId}/driver-location`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.position?.lat != null && data?.position?.lng != null) {
            setDriverPosition({ lat: data.position.lat, lng: data.position.lng });
          }
        })
        .catch(() => {});
    };

    poll();
    locationPollRef.current = setInterval(poll, 6000);

    return () => {
      if (locationPollRef.current) clearInterval(locationPollRef.current);
    };
  }, [bookingId]);

  /* ── Booking status polling → auto-redirect on COMPLETED / CANCELLED ── */
  useEffect(() => {
    if (!bookingId) return;

    const checkStatus = () => {
      fetch(`/api/bookings/${bookingId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.status === "COMPLETED") {
            if (statusPollRef.current) clearInterval(statusPollRef.current);
            router.replace(`/home/ride/completed?bookingId=${bookingId}`);
          } else if (data?.status === "CANCELLED") {
            if (statusPollRef.current) clearInterval(statusPollRef.current);
            router.replace("/home");
          }
        })
        .catch(() => {});
    };

    statusPollRef.current = setInterval(checkStatus, 8000);

    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [bookingId, router]);

  /* ── Directions callback from RideMap ── */
  const handleDirectionsFetched = useCallback(
    (durationText: string, durationSeconds: number) => {
      setEtaText(durationText);
      const arrival = new Date(Date.now() + durationSeconds * 1000);
      setArrivalTime(arrival.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    },
    []
  );

  /* ── Button handlers ── */
  const handleCall = () => {
    if (driverPhone) {
      window.location.href = `tel:${driverPhone}`;
    } else {
      alert("Driver phone number is not available.");
    }
  };

  const handleCancelRide = async () => {
    setCancelling(true);
    try {
      if (bookingId) {
        await fetch(`/api/bookings/${bookingId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED", cancelledBy: "user" }),
        });
      }
    } catch { /* silent — still navigate away */ }
    setCancelling(false);
    setShowCancelConfirm(false);
    router.push("/home");
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    setMessageSent(true);
    setTimeout(() => {
      setShowMessage(false);
      setMessageSent(false);
      setMessageText("");
    }, 1800);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Map */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "44vh", minHeight: "220px" }}>
        <div className="absolute top-4 left-5 z-[999]">
          <span className="text-white text-[16px] font-semibold drop-shadow-md">Ride</span>
        </div>
        <RideMap pickup={pickup} dropoff={dropoff} driverPosition={driverPosition} onDirectionsFetched={handleDirectionsFetched} />
      </div>

      {/* White panel */}
      <div className="relative flex-1 overflow-y-auto bg-white rounded-t-3xl z-10" style={{ boxShadow: "0 -8px 24px rgba(0,0,0,0.18)" }}>
        <div className="w-full max-w-lg md:max-w-2xl mx-auto px-5 pt-8 pb-28">

          {/* ETA */}
          <div className="mb-3">
            <p className="text-[30px] md:text-[34px] font-extrabold text-gray-900 leading-none">{etaText}</p>
            <p className="text-[12px] md:text-[13px] text-gray-400 mt-1">Driver is on the way</p>
          </div>

          <div className="h-[2px] w-full rounded-full mb-4" style={{ background: "linear-gradient(90deg, #2D0A53 0%, #8B7500 100%)" }} />

          {/* Driver + Car */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[18px] font-bold shrink-0" style={{ background: "linear-gradient(135deg, #2D0A53 0%, #8B7500 100%)" }}>
                {driverInitial}
              </div>
              <div>
                <p className="text-[14px] md:text-[15px] font-bold text-gray-900">{driverName}</p>
                <p className="text-[12px] font-semibold" style={{ color: "#f59e0b" }}>
                  ★ {driverRating != null ? driverRating.toFixed(1) : "New"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="w-[120px] h-[68px] rounded-xl bg-gray-50 overflow-hidden border border-gray-100 relative">
                <Image src={carImg} alt={car} fill className="object-contain p-1" unoptimized />
              </div>
              {tierLabel && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "linear-gradient(90deg, #2D0A53, #8B7500)" }}>
                  {tierLabel}
                </span>
              )}
              <p className="text-[12px] md:text-[13px] font-semibold text-gray-700">{car}</p>
              <p className="text-[11px] text-gray-400">{vehicleSeats} Seats</p>
            </div>
          </div>

          {/* Message / Call */}
          <div className="flex gap-3 mb-4">
            <button type="button" onClick={() => setShowMessage(true)} className="no-hover-fx flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-200 text-gray-700">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span className="text-[13px] font-medium">Message</span>
            </button>
            <button type="button" onClick={handleCall} className="no-hover-fx flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-200 text-gray-700">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5.06 2 2 0 0 1 3.58 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.91a16 16 0 0 0 6.1 6.1l1.08-1.08a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              <span className="text-[13px] font-medium">Call</span>
            </button>
          </div>

          {/* View toggle */}
          <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-full">
            <button type="button" onClick={() => setView("route")} className="flex-1 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200" style={view === "route" ? { background: "linear-gradient(90deg, #2D0A53, #8B7500)", color: "white" } : { color: "#6b7280" }}>Route</button>
            <button type="button" onClick={() => setView("actions")} className="flex-1 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200" style={view === "actions" ? { background: "linear-gradient(90deg, #2D0A53, #8B7500)", color: "white" } : { color: "#6b7280" }}>Actions</button>
          </div>

          {/* Route view */}
          {view === "route" && (
            <div className="flex flex-col gap-3 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-[14px] h-[14px] rounded-full shrink-0 mt-0.5" style={{ background: "#4f46e5" }} />
                <p className="text-[13px] md:text-[14px] text-gray-700 leading-snug break-words">{pickup}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-[14px] h-[14px] rounded-full bg-red-500 shrink-0 mt-0.5" />
                <p className="text-[13px] md:text-[14px] text-gray-700 leading-snug break-words">{dropoff}</p>
              </div>
            </div>
          )}

          {/* Actions view */}
          {view === "actions" && (
            <>
              <div className="flex items-start justify-between p-3 bg-gray-50 rounded-xl mb-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] md:text-[14px] font-semibold text-gray-900 truncate">{dropoff.split(",")[0]}</p>
                    {dropoffCity && <p className="text-[11px] text-gray-400 truncate">{dropoffCity}</p>}
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 whitespace-nowrap ml-3 mt-0.5 shrink-0">
                  {arrivalTime !== "..." ? `Arrive at ${arrivalTime}` : "Calculating…"}
                </span>
              </div>

              <div className="flex gap-2 mb-3">
                {[
                  {
                    label: "Change\nDestination",
                    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>),
                    onClick: () => router.push(`/home/pickup?tier=all&pickup=${encodeURIComponent(pickup)}`),
                  },
                  {
                    label: "Add Stop",
                    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>),
                    onClick: () => setShowAddStop(true),
                  },
                  {
                    label: "Support",
                    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D0A53" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
                    onClick: () => setShowSupport(true),
                  },
                  {
                    label: "Report\nIncident",
                    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>),
                    onClick: () => router.push(`/home/report-incident${bookingId ? `?bookingId=${bookingId}` : ""}`),
                  },
                ].map((btn) => (
                  <button key={btn.label} type="button" onClick={btn.onClick} className="no-hover-fx flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 bg-white">
                    {btn.icon}
                    <span className="text-[10px] md:text-[11px] font-medium text-gray-700 text-center leading-tight whitespace-pre-line">{btn.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100 z-[1001]">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto">
          {view === "route" ? (
            <button type="button" onClick={() => setShowCancelConfirm(true)} className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide" style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}>
              Cancel Ride
            </button>
          ) : (
            <button type="button" onClick={() => setShowEmergency(true)} className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide bg-red-500">
              Emergency
            </button>
          )}
        </div>
      </div>

      {/* ── Message Modal ── */}
      {showMessage && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-lg">
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Message {driverName}</h3>
            {messageSent ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p className="text-[13px] text-gray-600">Message sent to {driverName}</p>
              </div>
            ) : (
              <>
                <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type your message…" rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 resize-none focus:outline-none focus:border-[#2D0A53]" />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setShowMessage(false); setMessageText(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600">Cancel</button>
                  <button onClick={handleSendMessage} disabled={!messageText.trim()} className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-40" style={{ background: "linear-gradient(90deg, #2D0A53, #8B7500)" }}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add Stop Modal ── */}
      {showAddStop && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-lg">
            <h3 className="text-[15px] font-bold text-gray-900 mb-3">Add a Stop</h3>
            <input type="text" value={stopAddress} onChange={(e) => setStopAddress(e.target.value)} placeholder="Enter stop address" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-[#2D0A53]" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setShowAddStop(false); setStopAddress(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600">Cancel</button>
              <button onClick={() => { setShowAddStop(false); setStopAddress(""); }} className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold" style={{ background: "linear-gradient(90deg, #2D0A53, #8B7500)" }}>Add Stop</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Support Sheet ── */}
      {showSupport && (
        <SupportSheet
          bookingId={bookingId}
          driverName={driverName}
          driverPhone={driverPhone}
          onClose={() => setShowSupport(false)}
          onMessage={() => { setShowSupport(false); setShowMessage(true); }}
        />
      )}

      {/* ── Cancel Ride Confirmation ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-5">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 className="text-[15px] font-bold text-gray-900">Cancel Ride?</h3>
            </div>
            <p className="text-[12px] text-gray-500 mb-5">Are you sure you want to cancel this ride? Your driver has already been assigned.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700"
              >
                Keep Ride
              </button>
              <button
                type="button"
                onClick={handleCancelRide}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl text-white text-[13px] font-bold disabled:opacity-60"
                style={{ background: "linear-gradient(90deg, #1a1a2e, #2D0A53)" }}
              >
                {cancelling ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Emergency Modal ── */}
      {showEmergency && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-5">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 className="text-[15px] font-bold text-gray-900">Emergency</h3>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">Contact emergency services or Movo support immediately.</p>
            <div className="flex flex-col gap-2">
              <a href="tel:999" className="w-full py-3 rounded-xl bg-red-500 text-white text-[14px] font-bold text-center block">Call 999 (Emergency)</a>
              <a href="tel:+443330000000" className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-[14px] font-semibold text-center block">Call Movo Support</a>
              <button onClick={() => setShowEmergency(false)} className="w-full py-3 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function RideTrackingPage() {
  return (
    <Suspense>
      <RideTrackingContent />
    </Suspense>
  );
}
