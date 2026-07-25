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
  earning?: number;
  scheduledAt?: string | null;
  paymentStatus: string;
  status: string;
};

type CareAssignment = {
  id: string;
  role: "PRIMARY" | "SUPPORT";
  status: string;
  booking: {
    id: string;
    clientName: string;
    pickup: string;
    dropoff: string;
    carName: string;
    total: number;
    paymentStatus: string;
    status: string;
  };
};

type CoDriver = {
  id: string;
  role: "PRIMARY" | "SUPPORT";
  status: string;
  driver: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    photoUrl: string | null;
    vehicle: { make: string | null; model: string | null; plate: string | null } | null;
  };
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
  const [tripFeedback, setTripFeedback] = useState("");
  /* Feedback is mandatory for low ratings (≤3★) so admin can review issues */
  const lowRatingNeedsFeedback = tripRating > 0 && tripRating <= 3 && !tripFeedback.trim();
  const [actionLoading, setActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [stats, setStats] = useState<{ totalEarned: number; todayEarned: number; preBooked: number; tripsCompleted: number; tripsToday: number }>({ totalEarned: 0, todayEarned: 0, preBooked: 0, tripsCompleted: 0, tripsToday: 0 });
  /* Vehicle Rental: prompt chauffeurs with no vehicle to rent one. Only shown
     once we actually know (fetch resolved) they have neither a vehicle nor a
     rental already in flight. */
  const [rentalPrompt, setRentalPrompt] = useState(false);
  const [driverName, setDriverName] = useState<string>("");
  type ReservedRide = { id: string; clientName: string; pickup: string; dropoff: string; carName: string; scheduledAt: string | null; earning: number };
  const [reserved, setReserved] = useState<ReservedRide[]>([]);
  const [mapExpanded, setMapExpanded] = useState(false);
  /* Unclaimed SCHEDULED requests, visible even while OFFLINE — a chauffeur
     following the "open the app to accept" push must find the reservation
     waiting for them, not an empty dashboard that requires going on shift. */
  const [reservationRequests, setReservationRequests] = useState<Booking[]>([]);
  const [reservationActing,   setReservationActing]   = useState<string | null>(null);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const geoWatchRef     = useRef<number | null>(null);
  const onlineGeoRef    = useRef<number | null>(null);
  const lastPushRef     = useRef<number>(0);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const alertStopRef    = useRef<(() => void) | null>(null);
  const declinedIdsRef  = useRef<Set<string>>(new Set());
  const ridePhaseRef    = useRef<RidePhase>("idle");
  const [navEta,        setNavEta]        = useState<string | null>(null);
  const [careAssignment,   setCareAssignment]   = useState<CareAssignment | null>(null);
  const [coDriver,         setCoDriver]         = useState<CoDriver | null>(null);
  const [careEarning,      setCareEarning]      = useState<number>(0);
  const [reservationConfirmed, setReservationConfirmed] = useState(false);
  type CarePhase = "idle" | "requesting" | "accepted" | "arrived" | "started";
  const [carePhase,        setCarePhase]        = useState<CarePhase>("idle");
  const [careLoading,      setCareLoading]      = useState(false);
  const [careError,        setCareError]        = useState<string | null>(null);
  const [showCareComplete, setShowCareComplete] = useState(false);
  const [cancelNotice,     setCancelNotice]     = useState<string | null>(null);
  /* Surfaced when the browser can't get a GPS fix while online — previously
     silent, so a chauffeur with location blocked/unavailable never learned
     why they weren't receiving nearby (especially Safe Ride) requests. */
  const [locationWarning,  setLocationWarning]  = useState(false);
  /* Chauffeur backing out of an accepted ride/reservation before it starts —
     the booking is released back to the pool for auto-reassignment, not
     cancelled/refunded. */
  const [showDriverCancel, setShowDriverCancel] = useState(false);
  const [driverCancelReason, setDriverCancelReason] = useState("");
  const [driverCancelling, setDriverCancelling] = useState(false);
  const [driverCancelError, setDriverCancelError] = useState<string | null>(null);
  /* Rider's live position (pickup phase) — relayed over the socket */
  const [riderPos,         setRiderPos]         = useState<{ lat: number; lng: number } | null>(null);
  /* Wait-time billing: anchor + config returned by the arrived endpoint */
  const [waitInfo,         setWaitInfo]         = useState<{ arrivedAt: number; freeMin: number; rate: number } | null>(null);
  const [waitNow,          setWaitNow]          = useState(Date.now());

  /* Tick the waiting clock once a second while at pickup */
  useEffect(() => {
    if (!waitInfo || ridePhase !== "arrived") return;
    const t = setInterval(() => setWaitNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [waitInfo, ridePhase]);
  usePushSubscription();
  const { join, on } = useSocket();
  /* Keep ridePhaseRef in sync so async callbacks can read current phase without stale closure */
  useEffect(() => { ridePhaseRef.current = ridePhase; }, [ridePhase]);

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
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(s => ({ ...s, ...d })); })
      .catch(() => {});
    fetch("/api/driver/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.firstName) setDriverName(d.firstName); })
      .catch(() => {});
    fetch("/api/driver/reserved")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (Array.isArray(d)) setReserved(d); })
      .catch(() => {});
    fetch("/api/driver/rental")
      .then((r) => r.ok ? r.json() : null)
      /* Available to every chauffeur, not just vehicle-less ones — only
         suppressed while they already have an open request/active rental. */
      .then((d) => { if (d) setRentalPrompt(!d.active); })
      .catch(() => {});
  }, []);

  /* Poll for unclaimed SCHEDULED requests while the chauffeur is OFFLINE and
     idle. Immediate requests still require going online; reservations are
     future commitments and must be claimable straight from the push
     notification without starting a shift. */
  useEffect(() => {
    if (isOnline || ridePhase !== "idle" || carePhase !== "idle") {
      setReservationRequests([]);
      return;
    }
    const poll = () => {
      fetch("/api/bookings?status=PENDING")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          const list: Booking[] = Array.isArray(data) ? data : [];
          setReservationRequests(
            list
              .filter((b) => b.scheduledAt && new Date(b.scheduledAt).getTime() > Date.now())
              .filter((b) => !declinedIdsRef.current.has(b.id))
              .slice(0, 3),
          );
        })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 20_000);
    return () => clearInterval(t);
  }, [isOnline, ridePhase, carePhase]);

  async function acceptReservation(b: Booking) {
    if (reservationActing) return;
    setReservationActing(b.id);
    try {
      const res = await fetch(`/api/bookings/${b.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      setReservationRequests((prev) => prev.filter((r) => r.id !== b.id));
      if (res.ok) {
        setReservationConfirmed(true);
        fetch("/api/driver/reserved")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (Array.isArray(d)) setReserved(d); })
          .catch(() => {});
      }
    } catch {
      /* leave the card — next poll refreshes it */
    } finally {
      setReservationActing(null);
    }
  }

  function declineReservation(id: string) {
    declinedIdsRef.current.add(id);
    setReservationRequests((prev) => prev.filter((r) => r.id !== id));
  }

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

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
          join({ role: "driver", id: d.driverId, tier: d.tier ?? undefined });
        }
      })
      .catch(() => {});

    /* New booking arrived → pull the enriched pool record (includes this
       driver's payout) rather than trusting the lean socket payload, so the
       offer card shows earnings, not the customer total. */
    const unsubCreated = on(SOCKET_EVENTS.BOOKING_CREATED, (data) => {
      if (ridePhase !== "searching") return;
      const b = data as { id: string; status: string };
      if (declinedIdsRef.current.has(b.id)) return;
      if (b.status === "PENDING" || b.status === "CONFIRMED") {
        fetchNextPending();
      }
    });

    /* Rider's live position during pickup phase — shown on the driver map */
    const unsubRiderLoc = on(SOCKET_EVENTS.RIDER_LOCATION, (data) => {
      const d = data as { bookingId: string; lat: number; lng: number };
      setActiveBooking(prev => {
        if (prev?.id === d.bookingId) setRiderPos({ lat: d.lat, lng: d.lng });
        return prev;
      });
    });

    /* Booking cancelled while driver had it active */
    const unsubCancelled = on(SOCKET_EVENTS.BOOKING_CANCELLED, (data) => {
      const d = data as { bookingId: string; cancelledBy?: string };
      setActiveBooking(prev => {
        if (prev?.id === d.bookingId) {
          stopCountdown();
          stopAlert();
          /* Tell the chauffeur WHY the ride vanished — previously it silently
             flipped back to searching with no explanation. */
          if (d.cancelledBy !== "driver") {
            setCancelNotice(
              d.cancelledBy === "admin"
                ? "This ride was cancelled by Movo support. You're back in the queue for new requests."
                : "The rider cancelled this ride. You're back in the queue for new requests."
            );
          }
          setRiderPos(null);
          setRidePhase("searching");
          startPolling(fetchNextPending);
          return null;
        }
        return prev;
      });
    });

    /* Care: PRIMARY dispatched to this driver */
    const unsubCarePrimary = on(SOCKET_EVENTS.CARE_PRIMARY_DISPATCHED, (data) => {
      const d = data as { assignmentId: string; bookingId: string };
      if (carePhase !== "idle") return;
      fetch("/api/care/driver")
        .then(r => r.json())
        .then(({ assignment, coDriver: co, earning }) => {
          if (assignment && assignment.id === d.assignmentId) {
            setCareError(null);
            setCareAssignment(assignment as CareAssignment);
            setCoDriver(co ?? null);
            setCareEarning(earning ?? 0);
            setCarePhase("requesting");
            playRequestAlert();
            startCountdown(() => {
              stopAlert();
              setCareAssignment(null);
              setCoDriver(null);
              setCarePhase("idle");
            });
          }
        })
        .catch(() => {});
    });

    /* Care: SUPPORT dispatched to this driver */
    const unsubCareSupport = on(SOCKET_EVENTS.CARE_SUPPORT_DISPATCHED, (data) => {
      const d = data as { bookingId: string };
      if (carePhase !== "idle") return;
      fetch("/api/care/driver")
        .then(r => r.json())
        .then(({ assignment, coDriver: co, earning }) => {
          if (assignment?.booking?.id === d.bookingId) {
            setCareError(null);
            setCareAssignment(assignment as CareAssignment);
            setCoDriver(co ?? null);
            setCareEarning(earning ?? 0);
            setCarePhase("requesting");
            playRequestAlert();
            startCountdown(() => {
              stopAlert();
              setCareAssignment(null);
              setCoDriver(null);
              setCarePhase("idle");
            });
          }
        })
        .catch(() => {});
    });

    /* Care booking closed — clear state */
    const unsubCareClosed = on(SOCKET_EVENTS.CARE_BOOKING_CLOSED, (data) => {
      const d = data as { bookingId: string };
      setCareAssignment(prev => {
        if (prev?.booking?.id === d.bookingId) {
          setCarePhase("idle");
          setCoDriver(null);
          return null;
        }
        return prev;
      });
    });

    /* Primary just completed the customer leg — refresh so SUPPORT's co-driver
       status flips to COMPLETED and the "Pick Up Primary" button unlocks. */
    const unsubCarePickupReady = on(SOCKET_EVENTS.CARE_SUPPORT_PICKUP_READY, (data) => {
      const d = data as { bookingId: string };
      if (careAssignment?.booking?.id !== d.bookingId) return;
      fetch("/api/care/driver")
        .then(r => r.json())
        .then(({ coDriver: co }) => setCoDriver(co ?? null))
        .catch(() => {});
    });

    return () => { unsubCreated(); unsubRiderLoc(); unsubCancelled(); unsubCarePrimary(); unsubCareSupport(); unsubCareClosed(); unsubCarePickupReady(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, ridePhase, carePhase]);

  /* Poll for Care assignment on mount so a restored session restores Care state */
  useEffect(() => {
    fetch("/api/care/driver")
      .then(r => r.json())
      .then(({ assignment, coDriver: co, earning }) => {
        if (assignment) {
          setCareAssignment(assignment as CareAssignment);
          setCoDriver(co ?? null);
          setCareEarning(earning ?? 0);
          const s = assignment.status;
          if (s === "PENDING")  setCarePhase("requesting");
          if (s === "ACCEPTED") setCarePhase("accepted");
          if (s === "ARRIVED")  setCarePhase("arrived");
          if (s === "STARTED")  setCarePhase("started");
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!navigator.geolocation) { setLocationWarning(true); return; }
    if (onlineGeoRef.current !== null) navigator.geolocation.clearWatch(onlineGeoRef.current);
    onlineGeoRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationWarning(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        setDriverPos({ lat, lng });
        fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        }).catch(() => {});
      },
      /* Permission denied, timed out, or position unavailable — the server
         keeps whatever stale/null coordinates it already had, so nearby
         requests (e.g. Safe Ride) silently stop reaching this chauffeur.
         Surface it instead of failing invisibly. */
      () => setLocationWarning(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const stopOnlineLocationBroadcast = useCallback(() => {
    if (onlineGeoRef.current !== null) {
      navigator.geolocation.clearWatch(onlineGeoRef.current);
      onlineGeoRef.current = null;
    }
    setLocationWarning(false);
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
      /* Skip bookings this driver already declined */
      const next = bookings.find(b => !declinedIdsRef.current.has(b.id)) ?? null;
      /* Guard: only update state if still actively searching — prevents in-flight
         poll from overriding a just-accepted ride (race condition) */
      if (next && ridePhaseRef.current === "searching") {
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
      declinedIdsRef.current.clear();
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
    declinedIdsRef.current.clear();

    /* Scheduled ride → this is a RESERVATION, not a drive-now job. Confirm it,
       drop it into Reserved Rides (Planned), and keep the driver searching for
       immediate work. They'll activate it from Planned on the scheduled date. */
    const isScheduledAccept = activeBooking.scheduledAt
      && new Date(activeBooking.scheduledAt).getTime() > Date.now() + 25 * 60 * 1000;
    if (isScheduledAccept) {
      setActiveBooking(null);
      setReservationConfirmed(true);
      setRidePhase("searching");
      startPolling(fetchNextPending);
      return;
    }

    setRidePhase("accepted");
  }

  async function handleDecline() {
    stopCountdown();
    stopAlert();
    if (activeBooking) {
      declinedIdsRef.current.add(activeBooking.id);
      /* Release direct-to-driver bookings back to the open pool — otherwise
         a booking assigned specifically to this driver stays stuck on them
         forever, invisible to every other driver's pool query. */
      fetch(`/api/bookings/${activeBooking.id}/decline`, { method: "PATCH" }).catch(() => {});
    }
    setShowDeclineModal(false);
    setActiveBooking(null);
    setRidePhase("searching");
    startPolling(fetchNextPending);
  }

  /* Chauffeur can no longer make an already-ACCEPTED ride or reservation
     (before it starts). Releases the booking back to the pool for automatic
     reassignment to another online chauffeur — the rider is told we're
     finding them someone else, never that the ride was cancelled. */
  async function handleDriverCancelRide() {
    if (!activeBooking || driverCancelling) return;
    setDriverCancelling(true);
    setDriverCancelError(null);
    try {
      const res = await fetch(`/api/bookings/${activeBooking.id}/driver-cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: driverCancelReason.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDriverCancelError(d?.error ?? "Couldn't cancel this ride. Please try again.");
        setDriverCancelling(false);
        return;
      }
      stopLocationTracking();
      setShowDriverCancel(false);
      setDriverCancelReason("");
      setDriverCancelling(false);
      setActiveBooking(null);
      setWaitInfo(null);
      setRiderPos(null);
      setRidePhase("searching");
      startPolling(fetchNextPending);
    } catch {
      setDriverCancelError("Network error — please try again.");
      setDriverCancelling(false);
    }
  }

  async function handleArrived() {
    setRidePhase("arrived");
    if (!activeBooking) return;
    /* Persist arrivedAt (the wait-time billing anchor) and notify the rider —
       the server dispatches the socket event; the old client-side dispatcher
       import never reached the server's io instance. */
    try {
      const res = await fetch(`/api/bookings/${activeBooking.id}/arrived`, { method: "PATCH" });
      if (res.ok) {
        const d = await res.json();
        setWaitInfo({
          arrivedAt: new Date(d.arrivedAt).getTime(),
          freeMin:   d.freeWaitingMinutes ?? 5,
          rate:      d.waitingRatePerMin ?? 0.75,
        });
      }
    } catch {}
  }

  async function handleStartRide() {
    if (!activeBooking) return;
    setActionLoading(true);
    await fetch(`/api/bookings/${activeBooking.id}/start`, { method: "PATCH" });
    setActionLoading(false);
    startLocationTracking(activeBooking.id);
    setRiderPos(null); /* rider is in the car now */
    setWaitInfo(null); /* waiting clock stops at trip start */
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

  /* Open external Google Maps turn-by-turn to the given destination address.
     On mobile this launches the Google Maps app with live navigation. */
  function openExternalNav(destination: string) {
    if (!destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    window.open(url, "_blank", "noopener");
  }

  const NavigateButton = ({ destination }: { destination: string }) => (
    <button type="button" title="Navigate with Google Maps"
      onClick={() => openExternalNav(destination)}
      className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2">
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    </button>
  );

  /* ── Care assignment handlers ─────────────────────────────────────────── */

  async function handleCareAccept() {
    if (!careAssignment) return;
    stopCountdown();
    stopAlert();
    setCareLoading(true);
    setCareError(null);
    try {
      const res = await fetch(`/api/care/assignments/${careAssignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACCEPTED" }),
      });
      if (res.ok) {
        setCareLoading(false);
        setCarePhase("accepted");
        startOnlineLocationBroadcast();
        return;
      }
      /* Expired or taken by another chauffeur — tell the driver and clear the
         stale request instead of silently doing nothing. */
      const d = await res.json().catch(() => ({}));
      setCareError(d?.error ?? "Couldn't accept this request. Please try again.");
      if (res.status === 409 || res.status === 422) {
        setTimeout(() => {
          setCareError(null);
          setCareAssignment(null);
          setCoDriver(null);
          setCarePhase("idle");
        }, 3500);
      }
    } catch {
      setCareError("Network error — please try again.");
    } finally {
      setCareLoading(false);
    }
  }

  async function handleCareDecline() {
    if (!careAssignment) return;
    stopCountdown();
    stopAlert();
    setCareLoading(true);
    await fetch(`/api/care/assignments/${careAssignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setCareLoading(false);
    setCareAssignment(null);
    setCarePhase("idle");
  }

  async function handleCareArrived() {
    if (!careAssignment) return;
    setCareLoading(true);
    await fetch(`/api/care/assignments/${careAssignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARRIVED" }),
    });
    setCareLoading(false);
    setCarePhase("arrived");
  }

  async function handleCareStart() {
    if (!careAssignment) return;
    setCareLoading(true);
    await fetch(`/api/care/assignments/${careAssignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "STARTED" }),
    });
    setCareLoading(false);
    startLocationTracking(careAssignment.booking.id);
    setCarePhase("started");
  }

  /* ── Swipeable bottom sheet: collapsed ↔ default ↔ expanded ── */
  type PanelSize = "collapsed" | "default" | "expanded";
  const [panelSize, setPanelSize] = useState<PanelSize>("default");
  const panelTouchYRef = useRef<number | null>(null);
  const PANEL_MAX_H: Record<PanelSize, string> = { collapsed: "132px", default: "58vh", expanded: "92vh" };

  function onPanelHandleTouchStart(e: React.TouchEvent) {
    panelTouchYRef.current = e.touches[0].clientY;
  }
  function onPanelHandleTouchEnd(e: React.TouchEvent) {
    const startY = panelTouchYRef.current;
    panelTouchYRef.current = null;
    if (startY == null) return;
    const delta = e.changedTouches[0].clientY - startY;
    if (Math.abs(delta) < 30) return; /* tap, not a swipe */
    if (delta < 0) setPanelSize(s => (s === "collapsed" ? "default" : "expanded"));
    else           setPanelSize(s => (s === "expanded" ? "default" : "collapsed"));
  }
  /* Desktop fallback: clicking the handle cycles default → expanded → default */
  function onPanelHandleClick() {
    setPanelSize(s => (s === "expanded" ? "default" : "expanded"));
  }

  const panelHandle = (
    <div
      className="flex justify-center pt-0.5 pb-2.5 -mt-1 cursor-grab select-none"
      style={{ touchAction: "none" }}
      onTouchStart={onPanelHandleTouchStart}
      onTouchEnd={onPanelHandleTouchEnd}
      onClick={onPanelHandleClick}
    >
      <div className="w-12 h-1.5 rounded-full bg-gray-300" />
    </div>
  );

  /* Reset to default whenever a new request comes in so CTAs are never hidden */
  useEffect(() => {
    if (ridePhase === "requesting" || carePhase === "requesting") setPanelSize("default");
  }, [ridePhase, carePhase]);

  async function handleCareComplete() {
    if (!careAssignment) return;
    stopLocationTracking();
    setCareLoading(true);
    await fetch(`/api/care/assignments/${careAssignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    setCareLoading(false);
    /* Keep careAssignment alive so the modal can read booking.id for rating */
    setShowCareComplete(true);
  }

  /* Active trip (standard or Care accepted/arrived/started) keeps the fullscreen
     map + white bottom-sheet pattern; everything else — including INCOMING
     requests, standard and Care alike — renders inside the dark dashboard. */
  const inTrip =
    (carePhase !== "idle" && carePhase !== "requesting") ||
    ridePhase === "accepted" || ridePhase === "arrived" || ridePhase === "started";

  const darkCard: React.CSSProperties = { background: "#14141C", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ fontFamily: "var(--font-body)", background: "#0A0A0F" }}>

      {/* ── Dark dashboard — idle / searching / incoming request ── */}
      {!inTrip && (
        <div className="relative z-10 h-full overflow-y-auto">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-8 flex flex-col gap-4">

            {/* Header — greeting + bell + settings */}
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button className="no-hover-fx md:hidden shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={darkCard} onClick={() => setShowMenu(true)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <p className="text-[16px] font-bold text-white leading-tight truncate">
                    {greeting}{driverName ? `, ${driverName}` : ""}
                  </p>
                  <p className="text-[11px] font-semibold leading-tight" style={{ color: isOnline ? "#4ade80" : "rgba(255,255,255,0.5)" }}>
                    {isOnline ? "You're online" : "You're offline"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="no-hover-fx w-9 h-9 rounded-full flex items-center justify-center" style={darkCard}
                  onClick={() => router.push("/driver/home/news")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>
                <button className="no-hover-fx w-9 h-9 rounded-full flex items-center justify-center" style={darkCard}
                  onClick={() => router.push("/driver/home/profile")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Online / offline toggle card */}
            <div className="flex items-center justify-between rounded-2xl px-4 py-4"
              style={isOnline
                ? { background: "linear-gradient(135deg,#131936,#1e2a5e)", border: "1px solid rgba(198,191,178,0.35)" }
                : darkCard}>
              <div className="min-w-0 pr-3">
                <p className="text-[14px] font-bold text-white leading-tight">
                  {isOnline ? "You're online" : "You're offline"}
                </p>
                <p className="text-[11px] leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {isOnline ? "Receiving ride requests" : "Go online to start receiving rides"}
                </p>
              </div>
              <button onClick={handleToggleOnline}
                className="no-hover-fx shrink-0 w-[52px] h-[30px] rounded-full relative transition-colors duration-300"
                style={{ background: isOnline ? "#C6BFB2" : "rgba(255,255,255,0.15)" }}>
                <span className="absolute top-[3px] w-6 h-6 rounded-full bg-white transition-all duration-300 shadow"
                  style={{ left: isOnline ? "23px" : "3px" }} />
              </button>
            </div>

            {/* Location permission warning — without this, nearby requests
                (especially Safe Ride's distance-matched dispatch) silently
                stop reaching this chauffeur with no visible cause */}
            {isOnline && locationWarning && (
              <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <p className="text-[11px] leading-snug" style={{ color: "#fca5a5" }}>
                  Can&apos;t access your location. Enable location access for this site in your browser settings — otherwise nearby ride requests (including Safe Ride) may not reach you.
                </p>
              </div>
            )}

            {/* Map card — expandable */}
            <div className="relative rounded-2xl overflow-hidden" style={{ height: mapExpanded ? "58vh" : "180px", transition: "height 0.3s ease", border: "1px solid rgba(255,255,255,0.08)" }}>
              <DriverMap position={driverPos} navPhase={ridePhase} darkTheme />
              <button className="no-hover-fx absolute top-2 right-2 z-10 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(10,10,15,0.75)", border: "1px solid rgba(255,255,255,0.15)" }}
                onClick={() => setMapExpanded(v => !v)}>
                {mapExpanded ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                )}
              </button>
            </div>

            {/* Incoming Ride Requests */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[13px] font-bold text-white">Incoming Ride Requests</h2>
                {((ridePhase === "requesting" && activeBooking) || (carePhase === "requesting" && careAssignment)) && (
                  <span className="text-[12px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: timeLeft <= 10 ? "#ef4444" : "rgba(255,255,255,0.12)", color: "white" }}>
                    {timeLeft}s
                  </span>
                )}
              </div>

              {carePhase === "requesting" && careAssignment ? (
                <div className="rounded-2xl p-4" style={{ background: "#14141C", border: "1px solid rgba(198,191,178,0.45)" }}>
                  {/* Chips row */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[14px]">🌟</span>
                    <p className="text-[13px] font-bold text-white">Safe Ride</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(198,191,178,0.15)", color: "#C6BFB2" }}>
                      {careAssignment.role === "PRIMARY" ? "Primary Chauffeur" : "Support Chauffeur"}
                    </span>
                  </div>
                  {/* Client */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white">{careAssignment.booking.clientName}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Booking #{careAssignment.booking.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  {/* Route */}
                  <div className="flex flex-col gap-1.5 mb-3">
                    {careAssignment.role === "PRIMARY" ? (
                      <>
                        <div className="flex items-start gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: "#C6BFB2" }} />
                          <p className="text-[12px] leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{careAssignment.booking.pickup}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1" />
                          <p className="text-[12px] leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{careAssignment.booking.dropoff}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Rendezvous at destination</p>
                        <div className="flex items-start gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: "#C6BFB2" }} />
                          <p className="text-[12px] leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{careAssignment.booking.dropoff}</p>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Earnings */}
                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <p className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Est. Fare (your earnings)</p>
                    <p className="text-[15px] font-extrabold" style={{ color: "#C6BFB2" }}>${careEarning.toFixed(2)}</p>
                  </div>
                  {careError && (
                    <div className="mb-3 rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" }}>
                      <p className="text-[12px] font-semibold" style={{ color: "#f87171" }}>{careError}</p>
                    </div>
                  )}
                  {/* CTA */}
                  <div className="flex gap-3">
                    <button type="button" onClick={handleCareDecline} disabled={careLoading}
                      className="no-hover-fx flex-1 py-3 rounded-xl font-bold text-[14px]"
                      style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}>
                      Decline
                    </button>
                    <button type="button" onClick={handleCareAccept} disabled={careLoading}
                      className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
                      style={{ background: careLoading ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
                      {careLoading ? "…" : "Accept"}
                    </button>
                  </div>
                </div>
              ) : ridePhase === "requesting" && activeBooking ? (
                <div className="rounded-2xl p-4" style={{ background: "#14141C", border: "1px solid rgba(198,191,178,0.45)" }}>
                  {/* Chips row */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <p className="text-[13px] font-bold text-white">New Ride Request</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(198,191,178,0.15)", color: "#C6BFB2" }}>
                      {activeBooking.scheduledAt ? "Scheduled" : "Standard"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-white/10 text-white/70">
                      {activeBooking.carName}
                    </span>
                  </div>
                  {activeBooking.scheduledAt && (
                    <p className="text-[11px] font-semibold mb-2" style={{ color: "#C6BFB2" }}>
                      {new Date(activeBooking.scheduledAt).toLocaleString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  )}
                  {/* Rider */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                          <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white">{activeBooking.clientName}</p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Booking #{activeBooking.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    {activeBooking.paymentStatus === "PAID" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>
                        Paid
                      </span>
                    )}
                  </div>
                  {/* Route */}
                  <div className="flex flex-col gap-1.5 mb-3">
                    <div className="flex items-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: "#C6BFB2" }} />
                      <p className="text-[12px] leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{activeBooking.pickup}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1" />
                      <p className="text-[12px] leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{activeBooking.dropoff}</p>
                    </div>
                  </div>
                  {/* Earnings */}
                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <p className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Est. Fare (your earnings)</p>
                    <p className="text-[15px] font-extrabold" style={{ color: "#C6BFB2" }}>${(activeBooking.earning ?? 0).toFixed(2)}</p>
                  </div>
                  {/* CTA */}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowDeclineModal(true)} disabled={actionLoading}
                      className="no-hover-fx flex-1 py-3 rounded-xl font-bold text-[14px]"
                      style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}>
                      Decline
                    </button>
                    <button type="button" onClick={handleAccept} disabled={actionLoading}
                      className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
                      style={{ background: actionLoading ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
                      {actionLoading ? "…" : "Accept"}
                    </button>
                  </div>
                </div>
              ) : isOnline ? (
                <div className="rounded-2xl px-4 py-5 flex flex-col items-center gap-2" style={darkCard}>
                  <div className="w-7 h-7 border-[3px] rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.12)", borderTopColor: "#C6BFB2" }} />
                  <p className="text-[13px] font-semibold text-white">Looking for ride requests…</p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>New requests will appear automatically</p>
                </div>
              ) : (
                <div className="rounded-2xl px-4 py-5 flex flex-col items-center gap-1.5" style={darkCard}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5">
                    <path d="M5 17H3a1 1 0 0 1-1-1v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4a1 1 0 0 1-1 1h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
                  </svg>
                  <p className="text-[13px] font-semibold text-white">No incoming requests</p>
                  <p className="text-[11px] text-center" style={{ color: "rgba(255,255,255,0.45)" }}>Go online to start receiving ride requests.</p>
                </div>
              )}
            </section>

            {/* Reservation requests — claimable even while OFFLINE, so the
                "open the app to accept" push notification lands somewhere real */}
            {reservationRequests.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[13px] font-bold text-white">Reservation Requests</h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(198,191,178,0.15)", color: "#C6BFB2" }}>
                    No need to be online
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {reservationRequests.map((b) => (
                    <div key={b.id} className="rounded-2xl p-4" style={{ background: "#14141C", border: "1px solid rgba(198,191,178,0.45)" }}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <p className="text-[12px] font-bold text-white">
                            {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Scheduled"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] leading-none mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Your earnings</p>
                          <p className="text-[13px] font-extrabold leading-none" style={{ color: "#C6BFB2" }}>${(b.earning ?? 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 mb-3">
                        <div className="flex items-start gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: "#C6BFB2" }} />
                          <p className="text-[12px] leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{b.pickup}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1" />
                          <p className="text-[12px] leading-tight" style={{ color: "rgba(255,255,255,0.75)" }}>{b.dropoff}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => declineReservation(b.id)}
                          disabled={reservationActing === b.id}
                          className="no-hover-fx flex-1 py-2.5 rounded-xl font-bold text-[13px]"
                          style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)" }}>
                          Decline
                        </button>
                        <button type="button" onClick={() => acceptReservation(b)}
                          disabled={reservationActing === b.id}
                          className="no-hover-fx flex-1 py-2.5 rounded-xl text-white font-bold text-[13px]"
                          style={{ background: reservationActing === b.id ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
                          {reservationActing === b.id ? "…" : "Accept"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: "Today's Earnings", value: `$${stats.todayEarned.toFixed(2)}` },
                { label: "Trips Today",      value: `${stats.tripsToday}` },
                { label: "Total Earned",     value: `$${stats.totalEarned.toFixed(2)}` },
                { label: "Trips Completed",  value: `${stats.tripsCompleted}` },
              ] as { label: string; value: string }[]).map(t => (
                <div key={t.label} className="rounded-2xl px-3.5 py-3" style={darkCard}>
                  <p className="text-[11px] leading-none mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>{t.label}</p>
                  <p className="text-[17px] font-extrabold text-white leading-none">{t.value}</p>
                </div>
              ))}
            </div>

            {/* No vehicle yet — prompt to rent one from Movo */}
            {rentalPrompt && (
              <button type="button" onClick={() => router.push("/driver/home/rentals")}
                className="no-hover-fx w-full rounded-2xl px-4 py-4 flex items-center gap-3 text-left"
                style={{ background: "linear-gradient(135deg,#131936,#1e2a5e)", border: "1px solid rgba(198,191,178,0.35)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(198,191,178,0.15)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2"><path d="M5 17H3a1 1 0 0 1-1-1v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4a1 1 0 0 1-1 1h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white">Rent a Movo Vehicle</p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>From $89/day — daily, weekly, or monthly plans available</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2.5" className="shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}

            {/* Upcoming Reserved Rides */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[13px] font-bold text-white">Upcoming Reserved Rides</h2>
                <button className="no-hover-fx text-[11px] font-semibold" style={{ color: "#C6BFB2" }}
                  onClick={() => router.push("/driver/home/planned")}>
                  View all
                </button>
              </div>
              {reserved.length === 0 ? (
                <div className="rounded-2xl px-4 py-4" style={darkCard}>
                  <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>No reserved rides yet. Accepted scheduled rides will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {reserved.slice(0, 2).map(r => (
                    <button key={r.id} className="no-hover-fx rounded-2xl px-4 py-3 text-left w-full" style={darkCard}
                      onClick={() => router.push("/driver/home/planned")}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C6BFB2" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <p className="text-[12px] font-bold text-white">
                            {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Scheduled"}
                          </p>
                        </div>
                        <p className="text-[13px] font-extrabold" style={{ color: "#C6BFB2" }}>${(r.earning ?? 0).toFixed(2)}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: "#C6BFB2" }} />
                          <p className="text-[11px] leading-tight truncate" style={{ color: "rgba(255,255,255,0.65)" }}>{r.pickup}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />
                          <p className="text-[11px] leading-tight truncate" style={{ color: "rgba(255,255,255,0.65)" }}>{r.dropoff}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
      )}

      {/* ── Active trip — fullscreen map + bottom sheets ── */}
      {inTrip && (<>

      <DriverMap
        position={driverPos}
        riderPosition={riderPos}
        pickup={careAssignment
          ? (careAssignment.role === "PRIMARY" ? careAssignment.booking.pickup : careAssignment.booking.dropoff)
          : activeBooking?.pickup}
        dropoff={careAssignment
          ? (careAssignment.role === "SUPPORT" && carePhase === "started"
              ? careAssignment.booking.pickup /* return leg: driving Primary back to their parked car */
              : careAssignment.booking.dropoff)
          : activeBooking?.dropoff}
        navPhase={carePhase !== "idle" ? carePhase : ridePhase}
        onEta={setNavEta}
        darkTheme
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

        {/* Header — greeting + status + quick actions */}
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <button className="no-hover-fx md:hidden shrink-0 mr-2 w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow" onClick={() => setShowMenu(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-white leading-tight truncate" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              {greeting}{driverName ? `, ${driverName}` : ""}
            </p>
            <p className="text-[11px] font-semibold leading-tight" style={{ color: isOnline ? "#4ade80" : "rgba(255,255,255,0.75)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
              {isOnline ? "You're online" : "You're offline"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="no-hover-fx w-8 h-8 bg-white rounded-full flex items-center justify-center shadow"
              onClick={() => router.push("/driver/home/profile")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </button>
            <button
              onClick={handleToggleOnline}
              className="no-hover-fx flex items-center gap-2 px-4 py-1.5 rounded-full shadow font-semibold text-[13px] transition-all duration-300"
              style={isOnline
                ? { background: "linear-gradient(90deg,#131936,#C6BFB2)", color: "white" }
                : { background: "white", color: "#374151" }}
            >
              {isOnline ? "Online" : "Offline"}
            </button>
          </div>
        </header>

        <div className="flex-1" />

        {/* ── Care Assignment Bottom Sheet ── */}
        {careAssignment && carePhase !== "idle" && (
          <div className="bg-white rounded-t-3xl shadow-2xl px-4 pt-4 pb-6 overflow-y-auto"
            style={{ maxHeight: PANEL_MAX_H[panelSize], transition: "max-height 0.3s ease" }}>
            {panelHandle}
            {/* Header banner */}
            <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl"
              style={{ background: "linear-gradient(90deg,#131936,#1e2a5e)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[14px]">🌟</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12px] font-bold text-white">Safe Ride</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-white/15 text-white/80">Care</span>
                  </div>
                  <p className="text-[10px] text-white/70">
                    {careAssignment.role === "PRIMARY" ? "Primary Chauffeur" : "Support Chauffeur"}
                  </p>
                </div>
              </div>
            </div>
            {/* Co-driver status card */}
            {coDriver && (
              <div className="flex items-center gap-3 mb-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                  {coDriver.driver.photoUrl ? (
                    <img src={coDriver.driver.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-800 truncate">
                    {coDriver.driver.firstName} {coDriver.driver.lastName}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {coDriver.role === "PRIMARY" ? "Primary Chauffeur" : "Support Chauffeur"}
                    {coDriver.driver.vehicle ? ` · ${coDriver.driver.vehicle.make ?? ""} ${coDriver.driver.vehicle.model ?? ""}` : ""}
                  </p>
                  <p className="text-[10px] font-medium" style={{
                    color: coDriver.status === "COMPLETED" ? "#16a34a" :
                           coDriver.status === "STARTED" ? "#16a34a" :
                           coDriver.status === "ARRIVED" ? "#2563eb" :
                           coDriver.status === "ACCEPTED" ? "#d97706" :
                           "#6b7280"
                  }}>
                    {coDriver.status === "PENDING" ? "Awaiting acceptance…" :
                     coDriver.status === "ACCEPTED" ? "En route" :
                     coDriver.status === "ARRIVED" ? "Arrived at rendezvous" :
                     coDriver.status === "STARTED" ? "In transit" :
                     coDriver.status === "COMPLETED" ? (careAssignment.role === "SUPPORT" ? "Ready for pickup" : "Done") : coDriver.status}
                  </p>
                </div>
                {coDriver.driver.phone && (
                  <a href={`tel:${coDriver.driver.phone}`}
                    className="no-hover-fx w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
            {/* No co-driver yet hint (only after this driver has accepted) */}
            {!coDriver && carePhase !== "requesting" && careAssignment.role === "PRIMARY" && (
              <div className="flex items-center gap-2 mb-3 bg-amber-50 rounded-xl px-3 py-2.5">
                <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin shrink-0" />
                <p className="text-[11px] text-amber-700">Searching for a support chauffeur…</p>
              </div>
            )}
            {/* Route */}
            <div className="flex flex-col gap-1.5 mb-3 pl-1">
              {careAssignment.role === "PRIMARY" ? (
                <>
                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#131936] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-gray-600 leading-tight">{careAssignment.booking.pickup}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-gray-600 leading-tight">{careAssignment.booking.dropoff}</p>
                  </div>
                </>
              ) : carePhase === "started" ? (
                <>
                  <p className="text-[11px] font-semibold text-gray-500 mb-0.5">Returning Primary to their vehicle</p>
                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#131936] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-gray-600 leading-tight">{careAssignment.booking.pickup}</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-semibold text-gray-500 mb-0.5">Rendezvous at destination</p>
                  <div className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#131936] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-gray-600 leading-tight">{careAssignment.booking.dropoff}</p>
                  </div>
                </>
              )}
            </div>
            {/* Client + chauffeur earnings */}
            <div className="flex items-center justify-between mb-3 bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-[13px] font-semibold text-gray-800">{careAssignment.booking.clientName}</p>
              <div className="text-right">
                <p className="text-[9px] text-gray-400 leading-none mb-0.5">Your earnings</p>
                <p className="text-[13px] font-bold leading-none" style={{ color: "#C6BFB2" }}>
                  ${careEarning.toFixed(2)}
                </p>
              </div>
            </div>
            {/* CTA */}
            {careError && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <p className="text-[12px] font-semibold text-red-600">{careError}</p>
              </div>
            )}
            {carePhase === "accepted" && (
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/driver/home/finish/chat?bookingId=${careAssignment.booking.id}`)}
                  className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <NavigateButton destination={careAssignment.role === "PRIMARY" ? careAssignment.booking.pickup : careAssignment.booking.dropoff} />
                <button onClick={handleCareArrived} disabled={careLoading}
                  className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[15px]"
                  style={{ background: careLoading ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e,#131936,#C6BFB2)" }}>
                  {careLoading ? "…" : careAssignment.role === "PRIMARY" ? "I've Arrived at Pickup" : "I've Arrived at Rendezvous"}
                </button>
              </div>
            )}
            {carePhase === "arrived" && (() => {
              const waitingOnPrimary = careAssignment.role === "SUPPORT" && coDriver?.status !== "COMPLETED";
              return (
                <div className="flex flex-col gap-2">
                  {waitingOnPrimary && (
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin shrink-0" />
                      <p className="text-[11px] text-gray-500">Waiting for the Primary chauffeur to complete the ride…</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push(`/driver/home/finish/chat?bookingId=${careAssignment.booking.id}`)}
                      className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    <button onClick={handleCareStart} disabled={careLoading || waitingOnPrimary}
                      className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[15px]"
                      style={{ background: (careLoading || waitingOnPrimary) ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e,#131936,#C6BFB2)" }}>
                      {careLoading ? "…" : careAssignment.role === "PRIMARY" ? "Start Ride" : "Pick Up Primary Chauffeur"}
                    </button>
                  </div>
                </div>
              );
            })()}
            {carePhase === "started" && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/driver/home/finish/chat?bookingId=${careAssignment.booking.id}`)}
                    className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button onClick={handleCareComplete} disabled={careLoading}
                    className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[15px]"
                    style={{ background: careLoading ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e,#131936,#C6BFB2)" }}>
                    {careLoading ? "Saving…" : careAssignment.role === "SUPPORT" ? "Complete — Dropped Off Primary" : "Complete Assignment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Bottom sheet — phase aware, swipe up/down to expand/collapse ── */}
        {(ridePhase === "accepted" || ridePhase === "arrived" || ridePhase === "started") && activeBooking && (
          <div className="bg-white rounded-t-3xl shadow-2xl px-4 pt-4 pb-6 overflow-y-auto"
            style={{ maxHeight: PANEL_MAX_H[panelSize], transition: "max-height 0.3s ease" }}>
            {panelHandle}

            {/* Rider info row — accepted + arrived */}
            {(ridePhase === "accepted" || ridePhase === "arrived") && (
              <>
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

            {ridePhase === "accepted" && (
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => router.push(`/driver/home/finish/chat?bookingId=${activeBooking.id}`)}
                  className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <NavigateButton destination={activeBooking.pickup} />
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
                {/* Wait-time clock: free window countdown, then accruing charge */}
                {waitInfo && (() => {
                  const elapsedSec   = Math.max(0, Math.floor((waitNow - waitInfo.arrivedAt) / 1000));
                  const freeRemain   = Math.max(0, waitInfo.freeMin * 60 - elapsedSec);
                  const billableMin  = Math.max(0, Math.floor(elapsedSec / 60) - waitInfo.freeMin);
                  const accrued      = billableMin * waitInfo.rate;
                  const mm = String(Math.floor(freeRemain / 60)).padStart(1, "0");
                  const ss = String(freeRemain % 60).padStart(2, "0");
                  return freeRemain > 0 ? (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 mb-1">
                      <p className="text-[12px] font-semibold text-gray-600">Complimentary waiting</p>
                      <p className="text-[13px] font-bold" style={{ color: "#131936" }}>{mm}:{ss} left</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 mb-1">
                      <p className="text-[12px] font-semibold text-amber-700">Wait charges accruing (${waitInfo.rate.toFixed(2)}/min)</p>
                      <p className="text-[13px] font-bold text-amber-700">${accrued.toFixed(2)}</p>
                    </div>
                  );
                })()}
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => router.push(`/driver/home/finish/chat?bookingId=${activeBooking.id}`)}
                    className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <NavigateButton destination={activeBooking.pickup} />
                  <button type="button" onClick={handleStartRide}
                    disabled={actionLoading}
                    className="no-hover-fx flex-1 py-3 rounded-xl text-white font-bold text-[15px]"
                    style={{ background: actionLoading ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
                    {actionLoading ? "Starting…" : "Start Ride"}
                  </button>
                </div>
              </div>
            )}

            {(ridePhase === "accepted" || ridePhase === "arrived") && (
              <button type="button" onClick={() => setShowDriverCancel(true)}
                className="no-hover-fx w-full mt-2 py-2.5 rounded-xl text-[12px] font-semibold border border-red-200 text-red-600 bg-red-50">
                Can&apos;t make this ride — Cancel
              </button>
            )}

            {ridePhase === "started" && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => router.push(`/driver/home/finish/chat?bookingId=${activeBooking.id}`)}
                    className="no-hover-fx w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <NavigateButton destination={activeBooking.dropoff} />
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

      </>)}

      {/* Ride cancelled notice — rendered in both dashboard and trip modes */}
      {cancelNotice && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-xl">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-[16px] font-bold text-gray-900 mb-1">Ride Cancelled</p>
            <p className="text-[13px] text-gray-500 text-center mb-5">{cancelNotice}</p>
            <button type="button" onClick={() => setCancelNotice(null)}
              className="no-hover-fx w-full py-3 rounded-xl text-white font-bold text-[15px]"
              style={{ background: "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
              OK
            </button>
          </div>
        </div>
      )}

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
                { label: "Reserved Rides", href: "/driver/home/planned", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                { label: "Today's Rides", href: "/driver/home/finish/my-rides", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M5 17H3a1 1 0 0 1-1-1v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4a1 1 0 0 1-1 1h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg> },
                { label: "Earnings", href: "/driver/home/wallet", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.3a2.6 2.6 0 0 0-2.5-1.6c-1.4 0-2.5.9-2.5 2s1.1 1.7 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2a2.6 2.6 0 0 1-2.5-1.6"/><line x1="12" y1="6" x2="12" y2="7.7"/><line x1="12" y1="16.3" x2="12" y2="18"/></svg> },
                { label: "Rent a Vehicle", href: "/driver/home/rentals", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M5 17H3a1 1 0 0 1-1-1v-4l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4a1 1 0 0 1-1 1h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/><path d="M9.5 6h5"/></svg> },
                { label: "Inbox",   href: "/driver/home/news",    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7L22 6"/></svg> },
                { label: "Report Found Item", href: "/driver/home/report-found-item", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
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

      {/* Reservation confirmed modal (scheduled ride accepted) */}
      {reservationConfirmed && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-xl">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>
            </div>
            <p className="text-[16px] font-bold text-gray-900 mb-1">Reservation confirmed</p>
            <p className="text-[13px] text-gray-500 text-center mb-5">
              This scheduled ride is now in your Reserved Rides. Head there on the day to start the trip.
            </p>
            <div className="flex gap-3 w-full">
              <button type="button" onClick={() => setReservationConfirmed(false)}
                className="no-hover-fx flex-1 py-2.5 rounded-xl border border-gray-300 text-[14px] font-semibold text-gray-700">
                Keep driving
              </button>
              <button type="button" onClick={() => { setReservationConfirmed(false); router.push("/driver/home/planned"); }}
                className="no-hover-fx flex-1 py-2.5 rounded-xl text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(90deg,#1a1a2e,#131936,#C6BFB2)" }}>
                View Reserved
              </button>
            </div>
          </div>
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

      {/* Driver-cancel modal — backing out of an already-accepted ride/reservation.
          This releases the booking for automatic reassignment; it does NOT
          cancel or refund the rider's ride. */}
      {showDriverCancel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <p className="text-[16px] font-bold text-gray-900 mb-1">Cancel this ride?</p>
            <p className="text-[13px] text-gray-500 text-center mb-4">
              We&apos;ll automatically find another available chauffeur nearby — the rider will be told we&apos;re arranging this, not that their ride was cancelled.
            </p>
            <textarea
              value={driverCancelReason}
              onChange={(e) => setDriverCancelReason(e.target.value)}
              placeholder="Reason (optional) — e.g. vehicle issue, running too late"
              rows={2}
              className="w-full rounded-xl px-3 py-2 text-[12px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none mb-2"
              style={{ border: "1.5px solid #e5e7eb" }}
            />
            {driverCancelError && (
              <p className="text-[11px] text-red-600 mb-2 w-full">{driverCancelError}</p>
            )}
            <div className="flex gap-3 w-full">
              <button type="button"
                onClick={() => { setShowDriverCancel(false); setDriverCancelError(null); }}
                disabled={driverCancelling}
                className="no-hover-fx flex-1 py-2.5 rounded-xl font-semibold text-[14px] border border-gray-300 text-gray-700 disabled:opacity-50">
                Keep Ride
              </button>
              <button type="button"
                onClick={handleDriverCancelRide}
                disabled={driverCancelling}
                className="no-hover-fx flex-1 py-2.5 rounded-xl text-white font-bold text-[14px] disabled:opacity-60"
                style={{ background: "#dc2626" }}>
                {driverCancelling ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Complete modal — normal rides only */}
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
            <p className="text-[12px] text-gray-500 text-center mb-3">
              Trip completed — rate your rider.
            </p>
            <textarea
              value={tripFeedback}
              onChange={(e) => setTripFeedback(e.target.value)}
              placeholder={tripRating <= 3 ? "Required: what went wrong with this rider?" : "Notes about this rider (optional)…"}
              rows={2}
              className="w-full rounded-xl px-3 py-2 text-[12px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none mb-2"
              style={{ border: lowRatingNeedsFeedback ? "1.5px solid #f59e0b" : "1.5px solid #e5e7eb" }}
            />
            {lowRatingNeedsFeedback && (
              <p className="text-[11px] text-amber-600 mb-3 w-full">Feedback is required for ratings of 3 stars or lower.</p>
            )}
            <button type="button"
              disabled={lowRatingNeedsFeedback}
              onClick={async () => {
                if (activeBooking) {
                  await fetch(`/api/bookings/${activeBooking.id}/rating`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rating: tripRating, feedback: tripFeedback.trim() || null }),
                  });
                }
                setShowTripComplete(false);
                /* Stay ONLINE after completing a trip — going offline is the
                   chauffeur's explicit choice via the toggle, not a side
                   effect of finishing a ride. */
                setRidePhase("idle");
                setActiveBooking(null);
                setTripFeedback("");
                router.push("/driver/home/finish");
              }}
              className="no-hover-fx w-full py-3 rounded-xl text-white font-bold text-[15px] disabled:opacity-50"
              style={{ background: lowRatingNeedsFeedback ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
              Ok
            </button>
          </div>
        </div>
      )}

      {/* Care Assignment Complete modal — does NOT take driver offline */}
      {showCareComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center shadow-xl">
            <p className="text-[16px] font-bold text-gray-900 mb-1">Care Assignment Complete</p>
            <div className="w-16 h-16 mb-3 flex items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg,#0d1128,#131936)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-[#C6BFB2] uppercase tracking-wider mb-3">Safe Ride</p>
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
            <p className="text-[12px] text-gray-500 text-center mb-3">
              Rate your experience for this Care assignment.
            </p>
            <textarea
              value={tripFeedback}
              onChange={(e) => setTripFeedback(e.target.value)}
              placeholder={tripRating > 0 && tripRating <= 3 ? "Required: what went wrong?" : "Notes about this assignment (optional)…"}
              rows={2}
              className="w-full rounded-xl px-3 py-2 text-[12px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none mb-2"
              style={{ border: lowRatingNeedsFeedback ? "1.5px solid #f59e0b" : "1.5px solid #e5e7eb" }}
            />
            {lowRatingNeedsFeedback && (
              <p className="text-[11px] text-amber-600 mb-3 w-full">Feedback is required for ratings of 3 stars or lower.</p>
            )}
            <button type="button"
              disabled={lowRatingNeedsFeedback}
              onClick={async () => {
                const bookingIdForRating = careAssignment?.booking?.id;
                if (bookingIdForRating && tripRating > 0) {
                  await fetch(`/api/bookings/${bookingIdForRating}/rating`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rating: tripRating, feedback: tripFeedback.trim() || null }),
                  }).catch(() => {});
                }
                setShowCareComplete(false);
                setCareAssignment(null);
                setCarePhase("idle");
                setTripRating(0);
                setTripFeedback("");
                /* Driver stays online — Care assignment ended, not the whole shift */
                router.push("/driver/home/finish");
              }}
              className="no-hover-fx w-full py-3 rounded-xl text-white font-bold text-[15px] disabled:opacity-50"
              style={{ background: lowRatingNeedsFeedback ? "#9ca3af" : "linear-gradient(90deg,#1a1a2e 0%,#131936 50%,#C6BFB2 100%)" }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
