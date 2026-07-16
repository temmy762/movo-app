"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FeedbackPage() {
  const router = useRouter();
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { value: "general", label: "General" },
    { value: "app", label: "App Issue" },
    { value: "payment", label: "Payment" },
    { value: "safety", label: "Safety" },
    { value: "suggestion", label: "Suggestion" },
  ];

  async function handleSubmit() {
    if (!message.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button className="no-hover-fx p-1" onClick={() => router.back()}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
              <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
            </svg>
          </button>
          <h1 className="text-[18px] font-bold text-gray-900">Share Feedback</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg,#131936,#C6BFB2)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[17px] font-bold text-gray-900 mb-1">Thank you!</p>
          <p className="text-[13px] text-gray-500">Your feedback helps us improve Movo for everyone.</p>
          <button onClick={() => router.back()}
            className="mt-6 px-8 py-3 rounded-xl text-white font-bold text-[14px]"
            style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)" }}>
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-gray-900">Share Feedback</h1>
      </header>

      <div className="px-4 pt-5 pb-8 w-full max-w-lg mx-auto">
        <p className="text-[13px] text-gray-500 mb-4">We'd love to hear from you. Your feedback helps us improve.</p>

        <p className="text-[12px] font-bold text-gray-700 mb-2">Category</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {categories.map((c) => (
            <button key={c.value} type="button" onClick={() => setCategory(c.value)}
              className="no-hover-fx px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
              style={category === c.value
                ? { background: "linear-gradient(90deg,#131936,#C6BFB2)", color: "white", borderColor: "transparent" }
                : { background: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
              {c.label}
            </button>
          ))}
        </div>

        <p className="text-[12px] font-bold text-gray-700 mb-2">Your Message</p>
        <textarea
          rows={5}
          placeholder="Tell us what's on your mind…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[13px] text-gray-800 resize-none focus:outline-none focus:border-[#131936] mb-5"
        />

        <button type="button" onClick={handleSubmit} disabled={submitting || !message.trim()}
          className="w-full py-3.5 rounded-xl text-white font-bold text-[15px]"
          style={{ background: submitting || !message.trim() ? "#9ca3af" : "linear-gradient(90deg,#131936,#C6BFB2)" }}>
          {submitting ? "Sending…" : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
}
