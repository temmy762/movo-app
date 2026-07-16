"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MODULES = [
  {
    title: "Welcome to Movo",
    description:
      "Get introduced to the Movo platform, our mission, and what is expected of you as a partner chauffeur. Learn about our brand values, service standards, and the opportunities available to you.",
  },
  {
    title: "Chauffeur App: The Basics",
    description:
      "Learn how to navigate the Chauffeur App — from logging in and going online, to understanding your dashboard, managing your availability, and setting your status.",
  },
  {
    title: "Chauffeur App: Managing Rides",
    description:
      "Understand the full ride lifecycle: accepting ride requests, navigating to pickup, managing passenger interactions, completing rides, and handling cancellations.",
  },
  {
    title: "Waiting Time Policy",
    description:
      "Learn about our waiting time rules, grace periods for passengers, how to apply waiting charges, and best practices for handling late or no-show clients.",
  },
  {
    title: "Partner Portal",
    description:
      "Explore the Partner Portal — how to access your earnings reports, review your ride history, manage your profile, and submit support requests.",
  },
  {
    title: "Reviewing Rides",
    description:
      "Understand how to review completed rides, dispute a rating, provide feedback on passengers, and use the review system to maintain your performance score.",
  },
  {
    title: "Guidelines, Quality Standards & Incentives",
    description:
      "Read through the quality standards you are expected to uphold, including vehicle presentation, punctuality, and passenger communication. Learn about incentive programs and bonuses.",
  },
  {
    title: "How to Avoid Incidents",
    description:
      "Proactive safety: best practices for avoiding accidents, handling difficult passengers, managing fatigue, and reporting near-miss incidents through the app.",
  },
  {
    title: "Safety Guidelines & Emergency Procedures",
    description:
      "Critical safety protocols: what to do in an emergency, how to contact support, how to use the SOS feature in the app, and your responsibilities under local regulations.",
  },
];

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const mod = MODULES[id];

  const [completed, setCompleted] = useState<number[]>([]);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetch("/api/driver/training")
      .then((r) => r.json())
      .then((d) => setCompleted(d.completed ?? []));
  }, []);

  const isDone = completed.includes(id);

  const markComplete = async () => {
    setMarking(true);
    const res = await fetch("/api/driver/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleIndex: id }),
    });
    if (res.ok) {
      const d = await res.json();
      setCompleted(d.completed ?? []);
    }
    setMarking(false);
  };

  if (!mod) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">Module not found.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[480px] px-6">

          {/* Logo */}
          <div className="flex items-center justify-center pt-5">
            <div className="relative w-28 h-28">
              <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO" fill className="object-contain" priority />
            </div>
          </div>

          {/* Module number badge */}
          <div className="flex items-center gap-2 mt-3 mb-1">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
              style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)" }}>
              Module {id + 1} of {MODULES.length}
            </span>
            {isDone && (
              <span className="text-[11px] font-semibold text-green-600 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Completed
              </span>
            )}
          </div>

          <h1 className="text-[20px] font-bold text-gray-900 mb-3">{mod.title}</h1>

          <p className="text-[14px] text-gray-600 leading-relaxed mb-6">{mod.description}</p>

          {/* Placeholder content area */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-8 flex flex-col items-center text-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-3">
              <rect x="3" y="3" width="18" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <p className="text-[13px] font-semibold text-gray-500">Training content coming soon</p>
            <p className="text-[11px] text-gray-400 mt-1">Videos and materials will be added here.</p>
          </div>

          {/* Mark complete */}
          <button
            type="button"
            onClick={isDone ? undefined : markComplete}
            disabled={marking || isDone}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] mb-3"
            style={{
              background: isDone
                ? "#16a34a"
                : marking
                ? "#9ca3af"
                : "linear-gradient(90deg,#2D0A53,#8B7500)",
            }}
          >
            {isDone ? "✓ Module Completed" : marking ? "Saving…" : "Mark as Complete"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/driver/onboarding/partner/training")}
            className="w-full py-3 rounded-xl font-semibold text-[14px] border border-gray-200 text-gray-600 mb-8"
          >
            Back to Training
          </button>

        </div>
      </div>
    </div>
  );
}
