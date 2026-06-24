"use client";

import { useState } from "react";

/* ── Types ──────────────────────────────────────────────────────────────── */
type Category = "CONTACT_DRIVER" | "RIDE_ISSUE" | "PAYMENT_HELP" | "CHAT_SUPPORT";
type SheetView = "menu" | "form" | "success";

interface SupportSheetProps {
  bookingId:   string | null;
  driverName:  string;
  driverPhone: string | null;
  onClose:     () => void;
  onMessage:   () => void;
}

/* ── Sub-issue options per category ────────────────────────────────────── */
const ISSUES: Record<Exclude<Category, "CONTACT_DRIVER" | "CHAT_SUPPORT">, string[]> = {
  RIDE_ISSUE:   ["Driver behavior", "Wrong route taken", "Safety concern", "Vehicle condition", "Other"],
  PAYMENT_HELP: ["Incorrect charge", "Promo not applied", "Need receipt", "Refund request", "Other"],
};

/* ── Category metadata ──────────────────────────────────────────────────── */
const MENU_ITEMS: { category: Category; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    category: "CONTACT_DRIVER",
    label: "Contact Driver",
    sub: "Call or message your driver",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5.06 2 2 0 0 1 3.58 3h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.91a16 16 0 0 0 6.1 6.1l1.08-1.08a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    category: "RIDE_ISSUE",
    label: "Report Ride Issue",
    sub: "Route, driver, or vehicle problem",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    category: "PAYMENT_HELP",
    label: "Payment Help",
    sub: "Charges, receipts, or refunds",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    category: "CHAT_SUPPORT",
    label: "Chat Support",
    sub: "Message the Movo support team",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

/* ── Component ──────────────────────────────────────────────────────────── */
export default function SupportSheet({
  bookingId,
  driverName,
  driverPhone,
  onClose,
  onMessage,
}: SupportSheetProps) {
  const [view,        setView]        = useState<SheetView>("menu");
  const [category,    setCategory]    = useState<Category | null>(null);
  const [issue,       setIssue]       = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  const shortBooking = bookingId ? `#${bookingId.slice(-6).toUpperCase()}` : "";

  /* ── Submit support request ── */
  const handleSubmit = async () => {
    if (!category) return;
    setSubmitting(true);
    try {
      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, issue, description, bookingId }),
      });
    } catch { /* silent — we show success regardless for MVP */ }
    setSubmitting(false);
    setView("success");
  };

  /* ── Back from form ── */
  const goBack = () => {
    setView("menu");
    setCategory(null);
    setIssue(null);
    setDescription("");
  };

  /* ── Select a menu item ── */
  const selectCategory = (cat: Category) => {
    setCategory(cat);
    if (cat === "CONTACT_DRIVER") {
      /* No form — handled inline */
      setView("form");
    } else {
      setIssue(null);
      setDescription("");
      setView("form");
    }
  };

  /* ── Pill chip component ── */
  const Chip = ({ label }: { label: string }) => (
    <button
      type="button"
      onClick={() => setIssue(label)}
      className="px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all"
      style={
        issue === label
          ? { background: "linear-gradient(90deg,#131936,#C6BFB2)", color: "white", borderColor: "transparent" }
          : { background: "white", color: "#374151", borderColor: "#d1d5db" }
      }
    >
      {label}
    </button>
  );

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg"
        style={{ fontFamily: "var(--font-body)", maxHeight: "85vh", overflowY: "auto" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* ── Menu view ── */}
        {view === "menu" && (
          <div className="px-5 pb-8">
            <div className="flex items-center justify-between mb-1 mt-2">
              <h2 className="text-[17px] font-bold text-gray-900">Trip Support</h2>
              <button onClick={onClose} className="text-gray-400 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {shortBooking && (
              <p className="text-[12px] text-gray-400 mb-4">Booking {shortBooking}</p>
            )}

            <div className="flex flex-col gap-2">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => selectCategory(item.category)}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50 text-left active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900">{item.label}</p>
                    <p className="text-[11px] text-gray-400">{item.sub}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Contact Driver view ── */}
        {view === "form" && category === "CONTACT_DRIVER" && (
          <div className="px-5 pb-8">
            <div className="flex items-center gap-3 mt-2 mb-4">
              <button onClick={goBack} className="text-gray-400 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h2 className="text-[17px] font-bold text-gray-900">Contact Driver</h2>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-[16px]" style={{ background: "linear-gradient(135deg,#131936,#C6BFB2)" }}>
                {driverName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-900">{driverName}</p>
                <p className="text-[11px] text-gray-400">Your driver</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => driverPhone ? (window.location.href = `tel:${driverPhone}`) : alert("Phone number not available")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-[13px]"
                style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5.06 2 2 0 0 1 3.58 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.91a16 16 0 0 0 6.1 6.1l1.08-1.08a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Call Driver
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onMessage(); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-[13px]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Message
              </button>
            </div>
          </div>
        )}

        {/* ── Issue / Payment / Chat form view ── */}
        {view === "form" && category !== "CONTACT_DRIVER" && (
          <div className="px-5 pb-8">
            <div className="flex items-center gap-3 mt-2 mb-4">
              <button onClick={goBack} className="text-gray-400 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h2 className="text-[17px] font-bold text-gray-900">
                {category === "RIDE_ISSUE"   && "Report Ride Issue"}
                {category === "PAYMENT_HELP" && "Payment Help"}
                {category === "CHAT_SUPPORT" && "Chat Support"}
              </h2>
            </div>

            {/* Issue chips — only for RIDE_ISSUE and PAYMENT_HELP */}
            {(category === "RIDE_ISSUE" || category === "PAYMENT_HELP") && (
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  What&apos;s the issue?
                </p>
                <div className="flex flex-wrap gap-2">
                  {ISSUES[category].map((label) => (
                    <Chip key={label} label={label} />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-5">
              <p className="text-[12px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                {category === "CHAT_SUPPORT" ? "Your message" : "Additional details"}
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  category === "CHAT_SUPPORT"
                    ? "Type your message to Movo support…"
                    : "Describe what happened (optional)…"
                }
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 resize-none focus:outline-none focus:border-[#131936]"
              />
            </div>

            {/* Trip context badge */}
            {shortBooking && (
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg mb-4">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[11px] text-gray-400">This request will be linked to booking {shortBooking}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                submitting ||
                (category === "CHAT_SUPPORT" && !description.trim()) ||
                ((category === "RIDE_ISSUE" || category === "PAYMENT_HELP") && !issue)
              }
              className="w-full py-3 rounded-xl text-white font-bold text-[14px] tracking-wide disabled:opacity-40"
              style={{ background: "linear-gradient(90deg,#1a1a2e,#131936,#C6BFB2)" }}
            >
              {submitting ? "Submitting…" : "SUBMIT REQUEST"}
            </button>
          </div>
        )}

        {/* ── Success view ── */}
        {view === "success" && (
          <div className="px-5 pb-10 pt-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 mb-1">Request Received</h3>
            <p className="text-[13px] text-gray-500 mb-1">
              Our support team will get back to you shortly.
            </p>
            {shortBooking && (
              <p className="text-[12px] text-gray-400 mb-6">Linked to booking {shortBooking}</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl text-white font-bold text-[14px]"
              style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
