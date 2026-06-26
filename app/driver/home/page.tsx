"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { startAlertLoop, getPreferredSound } from "@/lib/driver-alert-sounds";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useSocket, SOCKET_EVENTS } from "@/context/SocketContext";

const DriverMap = dynamic(() => import("./DriverMap"), { ssr: false, loading: () => <div className="absolute inset-0" style={{ background: "#1a1e3c" }} /> });

type Booking = {
  id: string;
  clientName: string;
  pickup: string;
  dropoff: string;
  carName: string;
  total: number;
  paymentStatus: string;
  status: string;
};


export default function DriverHomePage() {
  const router = useRouter();
  type RidePhase = "idle" | "searching" | "requesting" | "accepted" | "arrived" | "started";
  const [isOnline, setIsOnline] = useState(false);
  const [ridePhase, setRidePhase] = useState<RidePhase>("idle");
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showTripComplete, setShowTripComplete] = useState(false);
  const [tripRating, setTripRating] = useState(4);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [stats, setStats] = useState<{ totalEarned: number; preBooked: number }>({ totalEarned: 0, preBooked: 0 });
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const geoWatchRef     = useRef<number | null>(null);
  const onlineGeoRef    = useRef<number | null>(null);
  const lastPushRef     = useRef<number>(0);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const alertStopRef    = useRef<(() => void) | null>(null);
  const [navEta,        setNavEta]        = useState<string | null>(null);
  usePushSubscription();
  const { join, on } = useSocket();
  const [timeLeft,      setTimeLeft]      = useState<number>(30);
  const [driverPos,     setDriverPos]     = useState<{ lat: number; lng: number } | null>(null);

  // Restore online state + detect active booking on mount
  useEffect(() => {
    fetch("/api/driver/active-booking")
      .then(r => r.json())
      .then(({ booking }) => {
        if (booking) {
          setActiveBooking(booking);
          setIsOnline(true);
          localStorage.setItem("driverOnline", "true");
          setRidePhase(booking.startedAt ? "started" : "accepted");
          startOnlineLocationBroadcast();
          if (booking.startedAt) startLocationTracking(booking.id);
        } else {
          const saved = localStorage.getItem("driverOnline") === "true";
          if (saved) {
            setIsOnline(true);
            setRidePhase("searching");
            startPolling(fetchNextPending);
            startOnlineLocationBroadcast();
          }
        }
      })
      .catch(() => {
        const saved = localStorage.getItem("driverOnline") === "true";
        if (saved) {
          setIsOnline(true);
          setRidePhase("searching");
          startPolling(fetchNextPending);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard: redirect drivers who are not ACTIVE away from the dashboard
  useEffect(() => {
    fetch("/api/driver/onboarding/status")
      .then(r => r.json())
      .then(d => {
        if (d.error === "Unauthorized") {
          router.replace("/driver/onboarding/login");
        } else if (d.adminStatus === "REJECTED") {
          router.replace("/driver/onboarding/rejected");
        } else if (d.adminStatus === "PENDING" || d.adminStatus === "UNDER_REVIEW") {
          router.replace("/driver/onboarding/pending");
        } else if (d.adminStatus === "NOT_SUBMITTED" || !d.adminStatus) {
          router.replace(d.type === "FLEET" ? "/driver/onboarding/partner" : "/driver/onboarding/chauffeur");
        }
        // adminStatus === "APPROVED" → stay on dashboard
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    fetch("/api/driver/stats")
      .then((r) => r.ok ? r.json() : { totalEarned: 0, preBooked: 0 })
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current)      clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (geoWatchRef.current  !== null) navigator.geolocation.clearWatch(geoWatchRef.current);
      if (onlineGeoRef.current !== null) navigator.geolocation.clearWatch(onlineGeoRef.current);
      alertStopRef.current?.();
    };
  }, []);

  /* Unlock AudioContext — called on any user gesture */
  const unlockAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext(); } catch { return; }
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume().catch(() => {});
  }, []);

  /* ── Socket: real-time booking notifications ── */
  useEffect(() => {
    if (!isOnline) return;
    /* Fetch driver id once to join the right rooms */
    fetch("/api/driver/onboarding/status")
      .then(r => r.json())
      .then(d => {
        if (d.driverId) {
          join({ role: "driver", id: d.driverId });
          if (d.tier) join({ role: "driver", id: d.tier }); /* tier room */
        }
      })
      .catch(() => {});

    /* New booking arrived → trigger request alert exactly like polling would */
    const unsubCreated = on(SOCKET_EVENTS.BOOKING_CREATED, (data) => {
      if (ridePhase !== "searching") return;
      const b = data as { id: string; pickup: string; dropoff: string; carTier: string; carName: string; total: number; status: string };
      if (b.status === "PENDING" || b.status === "CONFIRMED") {
        setActiveBooking(b as Booking);
        setRidePhase("requesting");
      }
    });

    /* Booking cancelled while driver had it active */
    const unsubCancelled = on(SOCKET_EVENTS.BOOKING_CANCELLED, (data) => {
      const d = data as { bookingId: string };
      setActiveBooking(prev => {
        if (prev?.id === d.bookingId) {
          setRidePhase("searching");
          startPolling(fetchNextPending);
          return null;
        }
        return prev;
      });
    });

    return () => { unsubCreated(); unsubCancelled(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, ridePhase]);

  /* One-time listener so a restored session gets audio unlocked on first tap */
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      document.removeEventListener("click",      handler);
      document.removeEventListener("touchstart", handler);
    };
    document.addEventListener("click",      handler, { once: true, passive: true });
    document.addEventListener("touchstart", handler, { once: true, passive: true });
    return () => {
      document.removeEventListener("click",      handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [unlockAudio]);

  const playRequestAlert = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const soundId = getPreferredSound();
    /* Resume context if the browser suspended it (e.g. tab was backgrounded) */
    const start = () => { alertStopRef.current = startAlertLoop(soundId, ctx); };
    if (ctx.state === "suspended") {
      ctx.resume().then(start).catch(() => {});
    } else {
      start();
    }
  }, []);

  const stopAlert = useCallback(() => {
    alertStopRef.current?.();
  }, []);

  /* Broadcast driver position while ONLINE (no booking needed) */
  const startOnlineLocationBroadcast = useCallback(() => {
    if (!navigator.geolocation) return;
    if (onlineGeoRef.current !== null) navigator.geolocation.clearWatch(onlineGeoRef.current);
    onlineGeoRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setDriverPos({ lat, lng });
        fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const stopOnlineLocationBroadcast = useCallback(() => {
    if (onlineGeoRef.current !== null) {
      navigator.geolocation.clearWatch(onlineGeoRef.current);
      onlineGeoRef.current = null;
    }
  }, []);

  const startLocationTracking = useCallback((bookingId: string) => {
    if (!navigator.geolocation) return;
    if (geoWatchRef.current !== null) navigator.geolocation.clearWatch(geoWatchRef.current);
    lastPushRef.current = 0;
    geoWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastPushRef.current < 5000) return; // throttle: max 1 push per 5 s
        lastPushRef.current = now;
        const { latitude: lat, longitude: lng, heading, speed } = pos.coords;
        /* POST to booking-specific endpoint — persists snapshot AND socket-broadcasts to rider */
        fetch(`/api/bookings/${bookingId}/driver-location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, heading, speed }),
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
    );
  }, []);

  const stopLocationTracking = useCallback(() => {
    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
    }
  }, []);

  const patchStatus = useCallback(async (id: string, status: string) => {
    await fetch(`/api/bookings/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }, []);

  const startCountdown = useCallback((onExpire: () => void) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTimeLeft(30);
    let remaining = 30;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        onExpire();
      }
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setTimeLeft(30);
  }, []);

  const fetchNextPending = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings?status=PENDING");
      const data = await res.json();
      const bookings: Booking[] = Array.isArray(data) ? data : [];
      const next = bookings[0] ?? null;
      if (next) {
        setActiveBooking(next);
        setRidePhase("requesting");
      }
    } catch {
      // network hiccup — keep polling
    }
  }, []);

  const startPolling = useCallback((poll: () => void) => {
    if (pollRef.current) clearInterval(pollRef.current);
    poll(); // immediate first check
    pollRef.current = setInterval(poll, 5000);
  }, []);

  /* Start 30s countdown + sound alert whenever a new request arrives */
  useEffect(() => {
    if (ridePhase !== "requesting" || !activeBooking) return;
    playRequestAlert();
    startCountdown(() => {
      stopAlert();
      setActiveBooking(null);
      setRidePhase("searching");
      startPolling(fetchNextPending);
    });
    return () => { stopCountdown(); stopAlert(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBooking?.id]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  async function handleToggleOnline() {
    const next = !isOnline;
    setIsOnline(next);
    localStorage.setItem("driverOnline", String(next));
    if (next) {
      unlockAudio(); // must happen inside user gesture to satisfy browser policy
      setRidePhase("searching");
      startPolling(fetchNextPending);
      startOnlineLocationBroadcast();
    } else {
      stopPolling();
      stopCountdown();
      stopOnlineLocationBroadcast();
      setRidePhase("idle");
      setActiveBooking(null);
      setShowDeclineModal(false);
      /* Mark driver offline in DB */
      fetch("/api/driver/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: false }),
      }).catch(() => {});
    }
  }

  async function handleAccept() {
    if (!activeBooking) return;
    stopPolling();
    stopCountdown();
    stopAlert();
    setActionLoading(true);
    const res = await fetch(`/api/bookings/${activeBooking.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    setActionLoading(false);
    if (res.status === 409) {
      /* Another driver got it first — resume searching */
      setActiveBooking(null);
      setRidePhase("searching");
      startPolling(fetchNextPending);
      return;
    }
    setRidePhase("accepted");
  }

  async function handleDecline() {
    stopCountdown();
    stopAlert();
    setShowDeclineModal(false);
    setActiveBooking(null);
    setRidePhase("searching");
    startPolling(fetchNextPending);
  }

  function handleArrived() {
    setRidePhase("arrived");
  }

  async function handleStartRide() {
    if (!activeBooking) return;
    setActionLoading(true);
    await fetch(`/api/bookings/${activeBooking.id}/start`, { method: "PATCH" });
    setActionLoading(false);
    startLocationTracking(activeBooking.id);
    setRidePhase("started");
  }

  async function handleEndRide() {
    if (!activeBooking) return;
    stopLocationTracking();
    setActionLoading(true);
    await patchStatus(activeBooking.id, "COMPLETED");
    setActionLoading(false);
    setShowTripComplete(true);
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ fontFamily: "var(--font-body)" }}>

      <DriverMap
        position={driverPos}
        pickup={activeBooking?.pickup}
        dropoff={activeBooking?.dropoff}
        navPhase={ridePhase}
        onEta={setNavEta}
      />

      {/* Nav ETA overlay — shown during active ride phases */}
      {navEta && (ridePhase === "accepted" || ridePhase === "arrived" || ridePhase === "started") && (
        <div className="absolute top-16 left-1/2 z-20 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2"
          style={{ background: "linear-gradient(90deg,#131936,#1e2a5e)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span className="text-white text-[12px] font-bold">{navEta}</span>
          <span className="text-white/60 text-[11px]">
            {ridePhase === "started" ? "to destination" : "to pickup"}
          </span>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">

        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <button className="no-hover-fx md:hidden w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow" onClick={() => setShowMenu(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <button
              className="no-hover-fx w-8 h-8 bg-white rounded-full flex items-center justify-center shadow"
              onClick={() => router.push("/driver/home/profile")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </button>
            <button
              onClick={handleToggleOnline}
              className="no-hover-fx flex items-center gap-2 px-4 py-1.5 rounded-full shadow font-semibold text-[13px] transition-all duration-300"
              style={isOnline
                ? { background: "linear-gradient(90deg,#131936,#C6BFB2)", color: "white" }
                : { background: "white", color: "#374151" }}
            >
              {isOnline ? "Online 🇬🇧" : "Offline"}
            </button>
          </div>
        </header>

        {/* Stat chips — offline only */}
        {!isOnline && (
          <div className="flex gap-3 px-4 mt-3">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
              <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 leading-none">Pre Booked</p>
                <p className="text-[13px] font-bold text-gray-800">{stats.preBooked}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
              <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 leading-none">Total Earned</p>
                <p className="text-[13px] font-bold text-gray-800">${stats.totalEarned.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Searching / waiting */}
        {ridePhase === "searching" && (
          <div className="bg-white rounded-t-3xl shadow-2xl px-4 pt-5 pb-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#131936] rounded-full animate-spin" />
            <p className="text-[14px] font-semibold text-gray-700">Looking for ride requests…</p>
            <p className="text-[11px] text-gray-400">New requests will appear automatically</p>
          </div>
        )}


        {/* ── Bottom sheet — phase aware ── */}
        {(ridePhase === "requesting" || ridePhase === "accepted" || ridePhase === "arrived" || ridePhase === "started") && activeBooking && (
          <div className="bg-white rounded-t-3xl shadow-2xl px-4 pt-4 pb-6">

            {/* Rider info row — requesting + accepted + arrived */}
            {(ridePhase === "requesting" || ridePhase === "accepted" || ridePhase === "arrived") && (
              <>
                {/* Incoming request banner */}
                {ridePhase === "requesting" && (
                  <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl"
                    style={{ background: "linear-gradient(90deg,#131936,#1e2a5e)" }}>
                    <div className="flex items-center gap-2">
                      {/* Pulsing dot */}
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                      </span>
                      <p className="text-[13px] font-bold text-white tracking-wide">New Ride Request!</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white">
                        {activeBooking.carName}
                      </span>
                      <span
                        className="text-[13px] font-bold w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          background: timeLeft <= 10 ? "#ef4444" : "rgba(255,255,255,0.15)",
                          color: "white",
                        }}
                      >
                        {timeLeft}
                      </span>
                    </div>
                  </div>
                )}

                {/* Accepted / arrived header */}
                {(ridePhase === "accepted" || ridePhase === "arrived") && (
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[15px] font-bold text-gray-900">
                    {ridePhase === "accepted" ? "Ride Accepted" : "Arrived at Pickup"}
                  </p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "#fef3c7", color: "#d97706" }}>
                    {activeBooking.carName}
                  </span>
                </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: "#131936" }}>{activeBooking.clientName}</p>
                      <p className="text-[11px] text-gray-400">Booking #{activeBooking.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <button className="no-hover-fx w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                    onClick={() => router.push(`/driver/home/finish/chat?bookingId=${activeBooking.id}`)}>  
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>
              </>
            )}

            {/* Route */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-gray-700">Trip Route</p>
            </div>
            <div className="flex flex-col gap-1.5 mb-3 pl-1">
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-full bg-[#131936] shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-600 leading-tight">{activeBooking.pickup}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-gray-600 leading-tight">{activeBooking.dropoff}</p>
              </div>
            </div>

            {/* Payment — requesting only */}
            {ridePhase === "requesting" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-semibold text-gray-700">Payment</p>
                  <p className="text-[13px] font-bold" style={{ color: "#C6BFB2" }}>${activeBooking.total.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      <div className="w-5 h-5 rounded-full bg-green-500" />
                      <div className="w-5 h-5 rounded-full bg-yellow-400 -ml-2" />
                    </div>
                    <p className="text-[13px] font-medium text-gray-700">
                      {activeBooking.paymentStatus === "PAID" ? "Paid via Stripe" : "Pending Payment"}
                    </p>
                  </div>
                  {activeBooking.paymentStatus === "PAID" && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </>
            )}

            {/* CTA buttons */}
            {ridePhase === "requesting" && (
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDeclineModal(true)}
                  disabled={actionLoading}
                  className="no-hover-fx flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-300 text-gray-700">
                  Decline
                </button>
                <button type="button" onClick={handleAccept}
                  disabled={actionLoading}
                  className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
                  style={{ background: actionLoading ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
                  {actionLoading ? "…" : "Accept"}
                </button>
              </div>
            )}

            {ridePhase === "accepted" && (
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => router.push(`/driver/home/finish/chat?bookingId=${activeBooking.id}`)}
                  className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <button type="button" onClick={handleArrived}
                  className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[15px]"
                  style={{ background: "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
                  I&apos;ve Arrived at Pickup
                </button>
              </div>
            )}

            {ridePhase === "arrived" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <p className="text-[12px] font-semibold text-green-700">You&apos;re at the pickup location</p>
                </div>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => router.push(`/driver/home/finish/chat?bookingId=${activeBooking.id}`)}
                    className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button type="button" onClick={handleStartRide}
                    disabled={actionLoading}
                    className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[15px]"
                    style={{ background: actionLoading ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
                    {actionLoading ? "Starting…" : "Start Ride"}
                  </button>
                </div>
              </div>
            )}

            {ridePhase === "started" && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => router.push(`/driver/home/finish/chat?bookingId=${activeBooking.id}`)}
                    className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button type="button" onClick={handleEndRide}
                    disabled={actionLoading}
                    className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[15px]"
                    style={{ background: actionLoading ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
                    {actionLoading ? "Saving…" : "End Ride"}
                  </button>
                </div>
                <button type="button"
                  onClick={() => router.push(`/driver/home/report-incident${activeBooking ? `?bookingId=${activeBooking.id}` : ""}`)}
                  className="no-hover-fx w-full py-2 rounded-xl text-[13px] font-semibold border border-red-200 text-red-600 bg-red-50">
                  Report Incident
                </button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Slide-in nav drawer ── */}
      {showMenu && (
        <div className="absolute inset-0 z-50 flex" onClick={() => setShowMenu(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Drawer */}
          <aside
            className="relative w-64 h-full flex flex-col py-6 px-4 shadow-2xl"
            style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #131936 60%, #C6BFB2 100%)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              className="no-hover-fx self-end mb-6 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"
              onClick={() => setShowMenu(false)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {/* Nav links */}
            <nav className="flex flex-col gap-1">
              {([
                { label: "Home",    href: "/driver/home",         icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg> },
                { label: "Offers",  href: "/driver/home/offers",  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeWidth="2.5"/></svg> },
                { label: "Planned", href: "/driver/home/planned", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" strokeWidth="3"/><line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" strokeWidth="3"/><line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" strokeWidth="3"/></svg> },
                { label: "Finish",  href: "/driver/home/finish",  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> },
                { label: "Profile", href: "/driver/home/profile", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
              ] as { label: string; href: string; icon: React.ReactNode }[]).map(item => (
                <button
                  key={item.href}
                  className="no-hover-fx flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                  onClick={() => { setShowMenu(false); router.push(item.href); }}
                >
                  {item.icon}
                  <span className="text-[14px] font-medium text-white">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Decline modal */}
      {showDeclineModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-xl">
            <p className="text-[16px] font-bold text-gray-900 mb-4">Decline Ride</p>
            <div className="relative w-28 h-28 mb-4">
              <Image src="/images/Rectangle 77.png" alt="Decline ride" fill className="object-contain" />
            </div>
            <p className="text-[13px] text-gray-500 text-center mb-5">
              Are you sure you want to decline the ride
            </p>
            <div className="flex gap-3 w-full">
              <button type="button" onClick={() => setShowDeclineModal(false)}
                className="no-hover-fx flex-1 py-2.5 rounded-xl font-semibold text-[14px] border border-gray-300 text-gray-700">
                Cancel
              </button>
              <button type="button"
                onClick={handleDecline}
                className="no-hover-fx flex-1 py-2.5 rounded-xl text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
                Sure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Complete modal */}
      {showTripComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-xl">
            <p className="text-[16px] font-bold text-gray-900 mb-3">Trip Complete</p>
            <div className="w-16 h-16 mb-3 flex items-center justify-center rounded-full bg-yellow-50">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
              </svg>
            </div>
            {/* Star rating */}
            <div className="flex gap-1 mb-2">
              {[1,2,3,4,5].map((s) => (
                <button key={s} className="no-hover-fx" onClick={() => setTripRating(s)}>
                  <svg width="28" height="28" viewBox="0 0 24 24"
                    fill={s <= tripRating ? "#f59e0b" : "none"}
                    stroke={s <= tripRating ? "#f59e0b" : "#d1d5db"} strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-[12px] text-gray-500 text-center mb-5">
              Trip completed review your trip now.
            </p>
            <button type="button"
              onClick={async () => {
                if (activeBooking) {
                  await fetch(`/api/bookings/${activeBooking.id}/rating`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rating: tripRating }),
                  });
                }
                setShowTripComplete(false);
                setRidePhase("idle");
                setIsOnline(false);
                localStorage.setItem("driverOnline", "false");
                setActiveBooking(null);
                router.push("/driver/home/finish");
              }}
              className="no-hover-fx w-full py-3 rounded-xl text-white font-bold text-[15px]"
              style={{ background: "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
              Ok
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
