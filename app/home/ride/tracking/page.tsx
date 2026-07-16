"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import SupportSheet from "./SupportSheet";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useSocket, SOCKET_EVENTS } from "@/context/SocketContext";

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
  const car       = searchParams.get("car")       || "Standard";
  const tier      = searchParams.get("tier")      || "";
  const carImgParam = searchParams.get("carImg")  || "";
  const bookingIdParam = searchParams.get("bookingId") || null;
  const paidFlag       = searchParams.get("paid");
  const intentId       = searchParams.get("intentId");
  const farePm         = searchParams.get("fare");
  const serviceFeePm   = searchParams.get("serviceFee");
  const totalPm        = searchParams.get("total");
  const scheduledAtPm  = searchParams.get("scheduledAt") || "";

  const [bookingId, setBookingId] = useState<string | null>(bookingIdParam);

  const [view, setView] = useState<"route" | "actions">("route");

  /* ── ETA / arrival ── */
  const [etaText,     setEtaText]     = useState("...");
  const [arrivalTime, setArrivalTime] = useState("...");

  /* ── Driver / vehicle info ── */
  const [driverName,     setDriverName]     = useState("Driver");
  const [driverRating,   setDriverRating]   = useState<number | null>(null);
  const [driverPhone,    setDriverPhone]    = useState<string | null>(null);
  const [vehicleSeats,     setVehicleSeats]     = useState<number>(4);
  const [vehicleImg,       setVehicleImg]       = useState<string>("");
  const [vehiclePlate,     setVehiclePlate]     = useState<string | null>(null);
  const [vehicleMakeModel, setVehicleMakeModel] = useState<string>("");
  const [rideStatus,       setRideStatus]       = useState<string>("PENDING");
  const [driverArrived,    setDriverArrived]    = useState(false);
  const [driverPosition,   setDriverPosition]   = useState<{ lat: number; lng: number } | null>(null);
  type CareAssignmentRow = { id: string; role: "PRIMARY" | "SUPPORT"; status: string; driverName: string };
  const [isCareRide,       setIsCareRide]       = useState(false);
  const [careAssignments,  setCareAssignments]  = useState<CareAssignmentRow[]>([]);
  const [chatOpen,    setChatOpen]    = useState(false);
  const [chatInput,   setChatInput]   = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatMsgs,    setChatMsgs]    = useState<{id:string;sender:string;text:string;createdAt:string}[]>([]);
  const chatBottomRef   = useRef<HTMLDivElement>(null);
  const chatPollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  usePushSubscription();
  const { join, leaveBooking, on } = useSocket();

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
  const [dispatchFailed,    setDispatchFailed]    = useState(false);
  const [noDriverRefunded,  setNoDriverRefunded]  = useState(false);
  const [scheduledForLabel, setScheduledForLabel] = useState<string | null>(null);

  /* ── Search progress (standard rides) — mirrors lib/dispatch/standardTimeout.ts windows ──
     "direct":     rider picked a specific driver, waiting for them to confirm (3 min)
     "pool":       open search, any online driver can accept (7 min)
     "reassigned": chosen driver didn't respond/declined — searching the pool (7 min) */
  const DIRECT_WINDOW_MS = 3 * 60 * 1000;
  const POOL_WINDOW_MS   = 7 * 60 * 1000;
  type SearchMode = "direct" | "pool" | "reassigned";
  const [searchMode,     setSearchMode]     = useState<SearchMode | null>(null);
  const [searchDeadline, setSearchDeadline] = useState<number | null>(null);
  const [nowTick,        setNowTick]        = useState(() => Date.now());
  const [showChangeDest,    setShowChangeDest]    = useState(false);
  const [newDestination,    setNewDestination]    = useState("");
  const [changingDest,      setChangingDest]      = useState(false);
  const [currentDropoff,    setCurrentDropoff]    = useState(dropoff);
  const [addingStop,        setAddingStop]        = useState(false);
  const [stopFeeAmount,     setStopFeeAmount]     = useState<number | null>(null);
  const [stopError,         setStopError]         = useState<string | null>(null);

  /* Add a stop mid-ride — charges the fee difference to the rider's card
     (on-session, so a 3DS challenge can pop right here if the bank asks). */
  const handleAddStop = async () => {
    if (!bookingId) return;
    setAddingStop(true);
    setStopError(null);
    try {
      let res = await fetch(`/api/bookings/${bookingId}/add-stop`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      let data = await res.json();

      if (res.ok && data.requiresAction && data.clientSecret) {
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");
        if (!stripe) throw new Error("Payment system unavailable");
        const { error: confirmErr } = await stripe.confirmCardPayment(data.clientSecret);
        if (confirmErr) throw new Error(confirmErr.message ?? "Card authentication failed");
        res = await fetch(`/api/bookings/${bookingId}/add-stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmedIntentId: data.intentId }),
        });
        data = await res.json();
      }

      if (!res.ok) throw new Error(data?.error ?? "Failed to add stop");
      setStopFeeAmount(data.charged ?? null);
      setShowAddStop(false);
      setStopAddress("");
    } catch (e) {
      setStopError(e instanceof Error ? e.message : "Failed to add stop. Please try again.");
    } finally {
      setAddingStop(false);
    }
  };

  const TIER_IMAGES: Record<string, string> = {
    classic:  "/images/movo classic.png",
    premium:  "/images/movo premium.png",
    black:    "/images/prive black.png",
  };
  const TIER_LABELS: Record<string, string> = {
    classic:  "Standard",
    premium:  "Executive",
    black:    "Concierge",
  };
  const resolvedTier = tier.toLowerCase().replace(/ /g, "") === "firstclass" ? "black" : tier.toLowerCase();
  const carImg = vehicleImg || carImgParam || TIER_IMAGES[resolvedTier] || "/images/movo classic.png";
  const tierLabel = TIER_LABELS[resolvedTier] || tier || "";
  const dropoffCity = dropoff.split(",").slice(1, 3).join(",").trim();
  const driverInitial = driverName.charAt(0).toUpperCase() || "D";

  /* ── 3DS redirect: no bookingId yet — create booking as PAID from URL params ── */
  useEffect(() => {
    if (paidFlag !== "1" || bookingId) return;
    if (!intentId || !farePm || !totalPm) return;
    const resolvedT = tier.toLowerCase() || "classic";
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: "Guest",
        pickup, dropoff,
        carTier: resolvedT, carName: car,
        fare: parseFloat(farePm),
        serviceFee: parseFloat(serviceFeePm ?? "0"),
        total: parseFloat(totalPm),
        paymentStatus: "PAID",
        stripePaymentIntentId: intentId,
        ...(scheduledAtPm ? { scheduledAt: scheduledAtPm } : {}),
      }),
    })
      .then(r => r.json())
      .then(data => { if (data?.id) setBookingId(data.id); })
      .catch(() => {});
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
        if (data.driver.vehicle?.plate)     setVehiclePlate(data.driver.vehicle.plate);
        if (data.driver.vehicle) {
          const mm = [data.driver.vehicle.year, data.driver.vehicle.make, data.driver.vehicle.model].filter(Boolean).join(" ");
          if (mm) setVehicleMakeModel(mm);
        }
      })
      .catch(() => {});
  }, [bookingId]);

  /* ── Detect Care Ride + fetch assignments ── */
  const fetchCareAssignments = useCallback((id: string) => {
    fetch(`/api/care/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.id || data.bookingType !== "CARE") return;
        setIsCareRide(true);
        const rows: CareAssignmentRow[] = (data.careAssignments ?? []).map((a: {
          id: string; role: string; status: string;
          driver?: { firstName?: string; lastName?: string };
        }) => ({
          id:         a.id,
          role:       a.role as "PRIMARY" | "SUPPORT",
          status:     a.status,
          driverName: a.driver ? `${a.driver.firstName ?? ""} ${a.driver.lastName ?? ""}`.trim() || "Searching…" : "Searching…",
        }));
        setCareAssignments(rows);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!bookingId) return;
    fetchCareAssignments(bookingId);
  }, [bookingId, fetchCareAssignments]);

  /* ── Care assignments polling — catches status changes when socket events are missed ── */
  useEffect(() => {
    if (!bookingId || !isCareRide) return;
    const timer = setInterval(() => fetchCareAssignments(bookingId), 6000);
    return () => clearInterval(timer);
  }, [bookingId, isCareRide, fetchCareAssignments]);

  /* ── Socket room join + realtime events ── */
  useEffect(() => {
    if (!bookingId) return;
    join({ role: "user", bookingId });

    /* Driver location pushed by driver app → instant map update */
    const unsubLoc = on(SOCKET_EVENTS.DRIVER_LOCATION, (data) => {
      const d = data as { bookingId: string; lat: number; lng: number };
      if (d.bookingId === bookingId) setDriverPosition({ lat: d.lat, lng: d.lng });
    });

    /* Trip started → switch to "Ride Started" tab */
    const unsubStarted = on(SOCKET_EVENTS.TRIP_STARTED, (data) => {
      const d = data as { bookingId: string };
      if (d.bookingId === bookingId) setRideStatus("STARTED");
    });

    /* Generic status change (e.g. PENDING → CONFIRMED when driver accepts) */
    const unsubStatus = on(SOCKET_EVENTS.BOOKING_STATUS, (data) => {
      const d = data as { bookingId: string; status: string };
      if (d.bookingId !== bookingId) return;
      if (d.status === "CONFIRMED") setRideStatus("CONFIRMED");
      else if (d.status === "COMPLETED") setRideStatus("COMPLETED");
      else if (d.status === "CANCELLED") {
        if (statusPollRef.current) clearInterval(statusPollRef.current);
        leaveBooking(bookingId);
        router.replace("/home");
      }
    });

    /* Booking completed → redirect to completed page */
    const unsubCompleted = on(SOCKET_EVENTS.BOOKING_COMPLETED, (data) => {
      const d = data as { bookingId: string };
      if (d.bookingId !== bookingId) return;
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      leaveBooking(bookingId);
      router.replace(`/home/ride/completed?bookingId=${bookingId}`);
    });

    /* Booking cancelled */
    const unsubCancelled = on(SOCKET_EVENTS.BOOKING_CANCELLED, (data) => {
      const d = data as { bookingId: string; cancelledBy?: string; refunded?: boolean };
      if (d.bookingId !== bookingId) return;
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      leaveBooking(bookingId);
      /* No driver ever accepted — show why instead of silently bouncing home */
      if (d.cancelledBy === "system_timeout") { setNoDriverRefunded(true); return; }
      router.replace("/home");
    });

    /* Booking accepted → update status + driver card instantly */
    const unsubAccepted = on(SOCKET_EVENTS.BOOKING_ACCEPTED, (data) => {
      const d = data as { bookingId: string; driverName?: string; vehicle?: string };
      if (d.bookingId !== bookingId) return;
      setRideStatus("CONFIRMED");
      setSearchMode(null);
      setSearchDeadline(null);
      if (d.driverName) setDriverName(d.driverName);
      if (d.vehicle)    setVehicleMakeModel(d.vehicle);
    });

    /* Chosen driver didn't respond or declined — booking released to the pool */
    const unsubReleased = on(SOCKET_EVENTS.DRIVER_RELEASED, (data) => {
      const d = data as { bookingId: string };
      if (d.bookingId !== bookingId) return;
      setSearchMode("reassigned");
      setSearchDeadline(Date.now() + POOL_WINDOW_MS);
      setRideStatus("PENDING");
      /* Clear the stale driver card — that driver is out of the picture */
      setDriverName("Driver");
      setDriverPhone(null);
      setDriverRating(null);
      setVehicleImg("");
      setVehiclePlate(null);
      setVehicleMakeModel("");
    });

    /* Driver arrived at pickup → show arrival banner */
    const unsubArrived = on(SOCKET_EVENTS.DRIVER_ARRIVED, (data) => {
      const d = data as { bookingId: string };
      if (d.bookingId === bookingId) setDriverArrived(true);
    });

    /* Care: primary driver accepted */
    const unsubCarePrimary = on(SOCKET_EVENTS.CARE_PRIMARY_ACCEPTED, (data) => {
      const d = data as { bookingId: string; assignmentId: string; driverName: string };
      if (d.bookingId !== bookingId) return;
      setCareAssignments(prev => {
        const exists = prev.some(a => a.id === d.assignmentId);
        if (exists) return prev.map(a => a.id === d.assignmentId ? { ...a, status: "ACCEPTED", driverName: d.driverName } : a);
        return [...prev, { id: d.assignmentId, role: "PRIMARY", status: "ACCEPTED", driverName: d.driverName }];
      });
    });

    /* Care: support driver accepted */
    const unsubCareSupport = on(SOCKET_EVENTS.CARE_SUPPORT_ACCEPTED, (data) => {
      const d = data as { bookingId: string; assignmentId: string; driverName: string };
      if (d.bookingId !== bookingId) return;
      setCareAssignments(prev => {
        const exists = prev.some(a => a.id === d.assignmentId);
        if (exists) return prev.map(a => a.id === d.assignmentId ? { ...a, status: "ACCEPTED", driverName: d.driverName } : a);
        return [...prev, { id: d.assignmentId, role: "SUPPORT", status: "ACCEPTED", driverName: d.driverName }];
      });
    });

    /* Care: any assignment status change */
    const unsubCareStatus = on(SOCKET_EVENTS.CARE_ASSIGNMENT_STATUS, (data) => {
      const d = data as { bookingId: string; assignmentId: string; status: string; role: string };
      if (d.bookingId !== bookingId) return;
      setCareAssignments(prev => {
        const exists = prev.some(a => a.id === d.assignmentId);
        if (exists) {
          return prev.map(a => a.id === d.assignmentId ? { ...a, status: d.status } : a);
        }
        /* New assignment dispatched mid-ride (re-dispatch) — add placeholder */
        return [...prev, { id: d.assignmentId, role: d.role as "PRIMARY" | "SUPPORT", status: d.status, driverName: "Searching…" }];
      });
    });

    /* Care: all dispatch retries exhausted — no driver found */
    const unsubDispatchFailed = on(SOCKET_EVENTS.CARE_DISPATCH_FAILED, (data) => {
      const d = data as { bookingId: string };
      if (d.bookingId !== bookingId) return;
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      setDispatchFailed(true);
    });

    /* Care: both drivers accepted — booking is now CONFIRMED */
    const unsubCareConfirmed = on(SOCKET_EVENTS.CARE_BOOKING_CONFIRMED, (data) => {
      const d = data as { bookingId: string };
      if (d.bookingId !== bookingId) return;
      setRideStatus("CONFIRMED");
      setIsCareRide(true);
    });

    /* Care: booking fully closed (both drivers completed) → redirect immediately */
    const unsubCareClosed = on(SOCKET_EVENTS.CARE_BOOKING_CLOSED, (data) => {
      const d = data as { bookingId: string };
      if (d.bookingId !== bookingId) return;
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      leaveBooking(bookingId);
      router.replace(`/home/ride/completed?bookingId=${bookingId}`);
    });

    return () => {
      unsubLoc(); unsubStarted(); unsubCompleted(); unsubCancelled(); unsubAccepted(); unsubStatus(); unsubArrived(); unsubReleased();
      unsubCarePrimary(); unsubCareSupport(); unsubCareStatus(); unsubCareConfirmed(); unsubCareClosed(); unsubDispatchFailed();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  /* ── Fallback location polling (used only if socket not connected) ── */
  useEffect(() => {
    if (!bookingId) return;
    const poll = () => {
      fetch(`/api/bookings/${bookingId}/driver-location`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.position?.lat != null && data?.position?.lng != null)
            setDriverPosition({ lat: data.position.lat, lng: data.position.lng });
        })
        .catch(() => {});
    };
    poll();
    locationPollRef.current = setInterval(poll, 8000); /* reduced — socket handles primary */
    return () => { if (locationPollRef.current) clearInterval(locationPollRef.current); };
  }, [bookingId]);

  /* ── Booking status polling → auto-redirect on COMPLETED / CANCELLED ── */
  useEffect(() => {
    if (!bookingId) return;

    const checkStatus = () => {
      fetch(`/api/bookings/${bookingId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;

          /* Scheduled-ride banner — only while still searching for a driver */
          if (data.scheduledAt && (data.status === "PENDING" || (data.status === "CONFIRMED" && !data.driver))) {
            const when = new Date(data.scheduledAt);
            if (!isNaN(when.getTime()) && when.getTime() > Date.now()) {
              setScheduledForLabel(when.toLocaleString("en-CA", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
            } else {
              setScheduledForLabel(null);
            }
          } else {
            setScheduledForLabel(null);
          }

          /* Derive effective ride status from booking status + startedAt */
          if (data.status === "COMPLETED") {
            setRideStatus("COMPLETED");
            if (statusPollRef.current) clearInterval(statusPollRef.current);
            router.replace(`/home/ride/completed?bookingId=${bookingId}`);
          } else if (data.status === "CANCELLED") {
            if (statusPollRef.current) clearInterval(statusPollRef.current);
            /* No driver ever accepted — show why instead of silently bouncing home */
            if (data.cancelledBy === "system_timeout") { setNoDriverRefunded(true); return; }
            router.replace("/home");
          } else if (data.startedAt) {
            /* Trip has started even though booking status is still CONFIRMED */
            setRideStatus("STARTED");
          } else if (data.status === "CONFIRMED" && !data.driver && data.bookingType !== "CARE") {
            /* Paid bookings auto-CONFIRM before any driver accepts, and an
               unresponsive pre-assigned driver can be released mid-search —
               either way, no driver attached means we're still searching. */
            setRideStatus("PENDING");
          } else if (data.status) {
            setRideStatus(data.status);
          }

          /* ── Search-progress countdown (standard rides only) ── */
          if (
            data.bookingType !== "CARE" && !data.startedAt &&
            (data.status === "PENDING" || data.status === "CONFIRMED")
          ) {
            if (data.driver && !data.acceptedAt) {
              /* Chosen driver hasn't confirmed yet — 3 min response window */
              setSearchMode(prev => (prev === "reassigned" ? prev : "direct"));
              setSearchDeadline(new Date(data.createdAt).getTime() + DIRECT_WINDOW_MS);
            } else if (!data.driver) {
              /* Open pool search — updatedAt is creation time for fresh pool
                 bookings and release time after an unresponsive driver */
              setSearchMode(prev => (prev === "reassigned" ? prev : "pool"));
              setSearchDeadline(new Date(data.updatedAt).getTime() + POOL_WINDOW_MS);
              /* Clear any stale driver card (release may have been missed by socket) */
              setDriverName("Driver");
              setDriverPhone(null);
              setDriverRating(null);
              setVehicleImg("");
              setVehiclePlate(null);
              setVehicleMakeModel("");
            } else {
              /* Driver actively accepted — search is over */
              setSearchMode(null);
              setSearchDeadline(null);
            }
          } else {
            setSearchMode(null);
            setSearchDeadline(null);
          }

          /* Keep the driver card fresh — a new driver can accept after a
             reassignment, and the one-shot details fetch won't re-run */
          if (data.driver && data.bookingType !== "CARE") {
            const name = `${data.driver.firstName ?? ""} ${data.driver.lastName ?? ""}`.trim();
            if (name) setDriverName(name);
            if (data.driver.phone) setDriverPhone(data.driver.phone);
            if (data.driver.avgRating != null) setDriverRating(data.driver.avgRating);
            if (data.driver.vehicle?.photoUrl) setVehicleImg(data.driver.vehicle.photoUrl);
            if (data.driver.vehicle?.plate) setVehiclePlate(data.driver.vehicle.plate);
            const mm = [data.driver.vehicle?.year, data.driver.vehicle?.make, data.driver.vehicle?.model].filter(Boolean).join(" ");
            if (mm) setVehicleMakeModel(mm);
          }
        })
        .catch(() => {});
    };

    checkStatus(); /* immediate — don't make the rider wait 8s for first state */
    statusPollRef.current = setInterval(checkStatus, 8000);

    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [bookingId, router]);

  /* ── Search countdown: tick every second while a deadline is active ── */
  useEffect(() => {
    if (!searchDeadline) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [searchDeadline]);

  const searchRemainingMs = searchDeadline ? Math.max(0, searchDeadline - nowTick) : 0;
  const searchCountdown = `${Math.floor(searchRemainingMs / 60000)}:${String(Math.floor((searchRemainingMs % 60000) / 1000)).padStart(2, "0")}`;

  /* ── Chat: load history on open + socket for new messages ── */
  useEffect(() => {
    if (!bookingId || !chatOpen) return;
    /* Load history once */
    fetch(`/api/bookings/${bookingId}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setChatMsgs(d); })
      .catch(() => {});
    /* Real-time incoming messages via socket */
    const unsub = on(SOCKET_EVENTS.MESSAGE_NEW, (data) => {
      const m = data as { bookingId: string; id: string; sender: string; text: string; createdAt: string };
      if (m.bookingId !== bookingId) return;
      setChatMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
    });
    return () => { unsub(); };
  }, [bookingId, chatOpen, on]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

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

  const handleSendChatMsg = async () => {
    const text = chatInput.trim();
    if (!text || !bookingId || chatSending) return;
    setChatSending(true);
    setChatInput("");
    await fetch(`/api/bookings/${bookingId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => {});
    setChatSending(false);
    fetch(`/api/bookings/${bookingId}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setChatMsgs(d); })
      .catch(() => {});
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-900" style={{ fontFamily: "var(--font-body)" }}>

      {/* Map */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "44vh", minHeight: "220px" }}>
        <div className="absolute top-4 left-5 z-[999]">
          <span className="text-white text-[16px] font-semibold drop-shadow-md">Ride</span>
        </div>
        <RideMap pickup={pickup} dropoff={dropoff} driverPosition={driverPosition} tripStarted={rideStatus === "STARTED"} onDirectionsFetched={handleDirectionsFetched} />
      </div>

      {/* White panel */}
      <div className="relative flex-1 overflow-y-auto bg-white rounded-t-3xl z-10" style={{ boxShadow: "0 -8px 24px rgba(0,0,0,0.18)" }}>
        <div className="w-full max-w-lg md:max-w-2xl mx-auto px-5 pt-8 pb-28">

          {/* ETA + Status stages */}
          <div className="mb-3">
            <p className="text-[26px] md:text-[30px] font-extrabold text-gray-900 leading-tight">
              {rideStatus === "PENDING" ? (scheduledForLabel ? "Ride Scheduled" : "Finding Your Chauffeur") : etaText}
            </p>
            <p className="text-[12px] md:text-[13px] text-gray-400 mt-1">
              {rideStatus === "PENDING"    ? (scheduledForLabel ? "We'll line up your chauffeur ahead of pickup." : isCareRide ? "Finding your chauffeurs…" : "We're contacting nearby chauffeurs — hang tight.") :
               rideStatus === "CONFIRMED"  ? (isCareRide ? "Both chauffeurs are on the way" : "Your chauffeur is on the way to you") :
               rideStatus === "STARTED"    ? "Ride in progress — arriving at your destination" :
               rideStatus === "COMPLETED"  ? "Ride completed" :
               "Ride in progress"}
            </p>
          </div>

          {/* Status progress bar */}
          <div className="flex items-center gap-1.5 mb-4">
            {[
              { key: "CONFIRMED", label: "On the Way" },
              { key: "STARTED",   label: "Ride Started" },
              { key: "COMPLETED", label: "Completed" },
            ].map((stage, i) => {
              const order = ["PENDING","CONFIRMED","STARTED","COMPLETED"];
              const active = order.indexOf(rideStatus) >= i + 1; /* +1 because PENDING is index 0 */
              return (
                <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full h-1.5 rounded-full" style={{ background: active ? "linear-gradient(90deg,#131936,#C6BFB2)" : "#e5e7eb" }} />
                  <p className="text-[9px] font-semibold" style={{ color: active ? "#131936" : "#9ca3af" }}>{stage.label}</p>
                </div>
              );
            })}
          </div>

          <div className="h-[2px] w-full rounded-full mb-4" style={{ background: "linear-gradient(90deg, #131936 0%, #C6BFB2 100%)" }} />

          {/* ── Care Ride: dual-driver status panel ── */}
          {isCareRide && (
            <div className="mb-4 rounded-2xl overflow-hidden border border-[#1e2a5e]/20"
              style={{ background: "linear-gradient(135deg,#0d1128 0%,#131936 60%,#1e2a5e 100%)" }}>
              <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <span className="text-[13px]">🌟</span>
                <p className="text-[12px] font-bold text-white tracking-wide">Safe Ride</p>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  Dual Chauffeur
                </span>
              </div>
              <div className="flex flex-col divide-y divide-white/10">
                {(["PRIMARY", "SUPPORT"] as const).map((role) => {
                  const assignment = careAssignments.find(a => a.role === role && a.status !== "CANCELLED");
                  const statusLabel: Record<string, string> = {
                    SEARCHING: "Searching…",
                    PENDING:   "Notified",
                    ACCEPTED:  "Accepted",
                    ARRIVED:   "Arrived",
                    STARTED:   "En route",
                    COMPLETED: "Done",
                    CANCELLED: "Cancelled",
                  };
                  const statusColor: Record<string, string> = {
                    SEARCHING: "#94a3b8",
                    PENDING:   "#fbbf24",
                    ACCEPTED:  "#34d399",
                    ARRIVED:   "#34d399",
                    STARTED:   "#60a5fa",
                    COMPLETED: "#a3e635",
                    CANCELLED: "#f87171",
                  };
                  const st = assignment?.status ?? "SEARCHING";
                  const name = assignment?.driverName ?? "Searching…";
                  return (
                    <div key={role} className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold text-white">
                          {role === "PRIMARY" ? "A" : "B"}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider leading-none mb-0.5">
                            {role === "PRIMARY" ? "Primary" : "Support"} Chauffeur
                          </p>
                          <p className="text-[13px] font-semibold text-white leading-none">{name}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: statusColor[st] + "22", color: statusColor[st] }}>
                        {statusLabel[st] ?? st}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Driver arrived banner */}
          {driverArrived && rideStatus === "CONFIRMED" && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <p className="text-[13px] font-semibold text-green-700">Your driver has arrived at the pickup location</p>
            </div>
          )}

          {/* Scheduled-ride banner */}
          {scheduledForLabel && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 mb-4">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p className="text-[12px] font-semibold text-indigo-700">Scheduled for {scheduledForLabel} — we'll line up your chauffeur in advance.</p>
            </div>
          )}

          {/* Waiting for chauffeurs banner — Care rides (hidden while a future
              scheduled pickup is still ahead; dispatch hasn't started yet) */}
          {rideStatus === "PENDING" && isCareRide && !scheduledForLabel && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 mb-4">
              <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin shrink-0" />
              <p className="text-[13px] font-semibold text-amber-700">
                Searching for your primary and support chauffeurs…
              </p>
            </div>
          )}

          {/* Search progress banner — standard rides, staged with live countdown */}
          {!isCareRide && (searchMode || rideStatus === "PENDING") && (
            <div className="px-3 py-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin shrink-0" />
                <p className="flex-1 text-[13px] font-semibold text-amber-700">
                  {searchMode === "direct"
                    ? `Waiting for ${driverName !== "Driver" ? driverName : "your driver"} to confirm…`
                    : searchMode === "reassigned"
                    ? "Your selected driver isn't available — finding you another driver nearby…"
                    : "Searching for a driver near you…"}
                </p>
                {searchDeadline != null && searchRemainingMs > 0 && (
                  <span className="text-[12px] font-bold text-amber-700 tabular-nums bg-amber-100 rounded-full px-2 py-0.5 shrink-0">
                    {searchCountdown}
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-1.5 ml-6" style={{ color: "#b45309" }}>
                {searchMode === "direct"
                  ? "If they don't confirm in time, we'll automatically find you another driver."
                  : "If no driver accepts before the timer ends, you'll be automatically refunded in full."}
              </p>
            </div>
          )}

          {/* Driver + Car — hidden for Care rides (dual-chauffeur panel handles this) */}
          {!isCareRide && <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[18px] font-bold shrink-0" style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
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
              {vehiclePlate && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-gray-900 text-white tracking-widest font-mono">
                  {vehiclePlate}
                </span>
              )}
              {(vehicleMakeModel || tierLabel) && (
                <p className="text-[11px] text-gray-500">{vehicleMakeModel || tierLabel}</p>
              )}
              <p className="text-[11px] text-gray-400">{vehicleSeats} Seats</p>
            </div>
          </div>}

          {/* Message / Call — hidden for Care (drivers are in the Care panel) */}
          {!isCareRide && <div className="flex gap-3 mb-4">
            <button type="button" onClick={() => setChatOpen(true)}
              className="no-hover-fx flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-200 text-gray-700 relative">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span className="text-[13px] font-medium">Message</span>
              {chatMsgs.filter(m => m.sender === "driver").length > 0 && !chatOpen && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {chatMsgs.filter(m => m.sender === "driver").length}
                </span>
              )}
            </button>
            <button type="button" onClick={handleCall} className="no-hover-fx flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-200 text-gray-700">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5.06 2 2 0 0 1 3.58 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.91a16 16 0 0 0 6.1 6.1l1.08-1.08a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              <span className="text-[13px] font-medium">Call</span>
            </button>
          </div>}

          {/* View toggle */}
          <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-full">
            <button type="button" onClick={() => setView("route")} className="flex-1 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200" style={view === "route" ? { background: "linear-gradient(90deg, #131936, #C6BFB2)", color: "white" } : { color: "#6b7280" }}>Route</button>
            <button type="button" onClick={() => setView("actions")} className="flex-1 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-200" style={view === "actions" ? { background: "linear-gradient(90deg, #131936, #C6BFB2)", color: "white" } : { color: "#6b7280" }}>Actions</button>
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
                    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>),
                    onClick: () => { setNewDestination(currentDropoff); setShowChangeDest(true); },
                  },
                  {
                    label: "Add Stop",
                    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>),
                    onClick: () => setShowAddStop(true),
                  },
                  {
                    label: "Support",
                    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
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
            <>
              <button type="button" onClick={() => setShowCancelConfirm(true)} className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide" style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
                Cancel Ride
              </button>
              {(searchMode || rideStatus === "PENDING") && (
                <p className="text-center text-[11px] text-gray-400 mt-1.5">
                  No driver confirmed yet — cancel anytime for a full refund.
                </p>
              )}
            </>
          ) : (
            <button type="button" onClick={() => setShowEmergency(true)} className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide bg-red-500">
              Emergency
            </button>
          )}
        </div>
      </div>

      {/* ── Live Chat Panel ── */}
      {chatOpen && (
        <div className="fixed inset-0 z-[2000] flex flex-col bg-white">
          <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
            <button className="no-hover-fx" onClick={() => setChatOpen(false)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#f3f4f6"/>
                <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none"/>
              </svg>
            </button>
            <div>
              <p className="text-[15px] font-bold text-gray-900">Chat with {driverName}</p>
              <p className="text-[11px] text-gray-400">Messages are delivered instantly</p>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {chatMsgs.length === 0 && (
              <p className="text-center text-[13px] text-gray-400 mt-8">No messages yet. Say hello!</p>
            )}
            {chatMsgs.map(msg => {
              const isMe = msg.sender === "rider";
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-1`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-600 shrink-0">{driverInitial}</div>
                  )}
                  <div className="max-w-[75%] px-4 py-2.5 rounded-2xl text-[14px] leading-snug"
                    style={isMe
                      ? { background: "linear-gradient(135deg,#131936,#C6BFB2)", color: "white", borderBottomRightRadius: "4px" }
                      : { background: "#f3f4f6", color: "#1f2937", borderBottomLeftRadius: "4px" }}>
                    {msg.text}
                  </div>
                  <p className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</p>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>
          <div className="shrink-0 px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: "linear-gradient(135deg,#0A0A0F,#131936,#2A3055)" }}>
              <input type="text" className="flex-1 bg-transparent text-white placeholder-white/50 text-[14px] focus:outline-none"
                style={{ WebkitTextFillColor: "white", caretColor: "white" }}
                placeholder="Write a message…" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendChatMsg()} />
              <button className="no-hover-fx shrink-0 disabled:opacity-50" onClick={handleSendChatMsg} disabled={chatSending || !chatInput.trim()}>
                {chatSending
                  ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none"/></svg>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Stop Modal ── */}
      {showAddStop && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-lg">
            <h3 className="text-[15px] font-bold text-gray-900 mb-1">Add a Stop</h3>
            <p className="text-[12px] text-gray-500 mb-1">
              The additional stop fee (plus tax) will be charged to your card on file.
            </p>
            {stopFeeAmount != null && (
              <p className="text-[12px] font-semibold text-green-600 mb-2">✓ ${stopFeeAmount.toFixed(2)} charged for your last stop.</p>
            )}
            {stopError && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">{stopError}</p>
            )}
            <input
              type="text"
              value={stopAddress}
              onChange={(e) => setStopAddress(e.target.value)}
              placeholder="Enter stop address"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-[#131936] mt-2"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setShowAddStop(false); setStopAddress(""); setStopError(null); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={!stopAddress.trim() || addingStop}
                onClick={handleAddStop}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50"
                style={{ background: "linear-gradient(90deg, #131936, #C6BFB2)" }}
              >
                {addingStop ? "Adding…" : "Add Stop"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Destination Modal ── */}
      {showChangeDest && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-lg">
            <h3 className="text-[15px] font-bold text-gray-900 mb-1">Change Destination</h3>
            <p className="text-[12px] text-gray-400 mb-3">Update where you'd like to be dropped off.</p>
            <input
              type="text"
              value={newDestination}
              onChange={(e) => setNewDestination(e.target.value)}
              placeholder="New destination address"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-[#131936]"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setShowChangeDest(false); setNewDestination(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={!newDestination.trim() || changingDest}
                onClick={async () => {
                  if (!bookingId || !newDestination.trim()) return;
                  setChangingDest(true);
                  try {
                    await fetch(`/api/bookings/${bookingId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ dropoff: newDestination.trim() }),
                    });
                    setCurrentDropoff(newDestination.trim());
                  } catch { /* ignore */ } finally {
                    setChangingDest(false);
                    setShowChangeDest(false);
                    setNewDestination("");
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50"
                style={{ background: "linear-gradient(90deg, #131936, #C6BFB2)" }}
              >
                {changingDest ? "Updating…" : "Confirm"}
              </button>
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
            <p className="text-[12px] text-gray-500 mb-5">
              {(searchMode || rideStatus === "PENDING")
                ? "No driver has confirmed yet, so you'll receive a full refund right away."
                : "Are you sure you want to cancel this ride? Your driver has already been assigned."}
            </p>
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
                style={{ background: "linear-gradient(90deg, #1a1a2e, #131936)" }}
              >
                {cancelling ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Care Dispatch Failed overlay ── */}
      {dispatchFailed && (
        <div className="fixed inset-0 z-[2100] flex items-end justify-center px-4 pb-10"
          style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <p className="text-[16px] font-bold text-gray-900 mb-2">No chauffeurs available</p>
            <p className="text-[13px] text-gray-500 mb-6 leading-snug">
              We were unable to find a Care Ride chauffeur in your area at this time. Please try again shortly or contact support.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/home")}
              className="w-full py-3.5 rounded-xl text-white font-bold text-[14px]"
              style={{ background: "linear-gradient(135deg,#0A0A0F,#131936,#2A3055)" }}>
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ── No driver found (standard ride) — auto-refunded overlay ── */}
      {noDriverRefunded && (
        <div className="fixed inset-0 z-[2100] flex items-end justify-center px-4 pb-10"
          style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <p className="text-[16px] font-bold text-gray-900 mb-2">No driver found</p>
            <p className="text-[13px] text-gray-500 mb-6 leading-snug">
              We weren't able to find a driver for your ride in time. You've been fully refunded — please try booking again.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/home")}
              className="w-full py-3.5 rounded-xl text-white font-bold text-[14px]"
              style={{ background: "linear-gradient(135deg,#0A0A0F,#131936,#2A3055)" }}>
              Back to Home
            </button>
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
