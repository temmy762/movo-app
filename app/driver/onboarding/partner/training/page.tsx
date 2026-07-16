"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TOTAL_STEPS = 9;

const modules = [
  "Welcome to Movo",
  "Chauffeur App: The Basics",
  "Chauffeur App: Managing Rides",
  "Waiting Time Policy",
  "Partner Portal",
  "Reviewing Rides",
  "Guidelines, Quality Standards & Incentives",
  "How to Avoid Incidents",
  "Safety Guidelines & Emergency Procedures",
];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full max-w-[320px] mx-auto my-4">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center"
            style={{ background: i < step ? "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" : "#d1d5db" }}
          >
            {i < step && (
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div className="h-[2px] flex-1" style={{ background: i < step - 1 ? "linear-gradient(90deg, #131936, #C6BFB2)" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function TrainingModulesPage() {
  const router = useRouter();
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/driver/training");
        if (r.status === 401) { router.push("/driver/onboarding/login"); return; }
        const text = await r.text();
        if (!text) return;
        const d = JSON.parse(text);
        setCompletedIndices(d.completed ?? []);
      } catch {
        // network error or malformed response — leave list empty
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const completedCount = completedIndices.length;

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[480px] px-6">

          {/* Logo */}
          <div className="flex items-center justify-center pt-5">
            <div className="relative w-36 h-36">
              <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO" fill className="object-contain" priority />
            </div>
          </div>

          <h1 className="text-[20px] font-bold text-gray-900 mt-1 text-center">Fleet Partner Onboarding</h1>
          <ProgressBar step={6} />

          {/* Intro */}
          <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
            Welcome to the{" "}
            <span className="font-semibold" style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Movo
            </span>{" "}
            Partner Training. To begin offering rides with{" "}
            <span className="font-semibold" style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Movo
            </span>
            , please complete the following nine modules. Each module can be accessed individually using the links below.
          </p>

          {loading ? (
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          ) : (
            <p className="text-[13px] text-gray-500 mb-4">
              You have completed <strong>{completedCount}</strong> out of {modules.length} modules.
            </p>
          )}

          {/* Module index + links + progress side by side */}
          <div className="mb-6">
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2 items-center mb-1">
              <span className="text-[11px] font-bold text-gray-400">#</span>
              <span className="text-[11px] font-bold text-gray-400">Module</span>
              <span className="text-[11px] font-bold text-gray-400 text-right">Progress</span>
            </div>
            {modules.map((mod, i) => {
              const done = completedIndices.includes(i);
              return (
                <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0 items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-[12px] text-gray-400 w-5">{i + 1}.</span>
                  <Link
                    href={`/driver/onboarding/partner/training/${i}`}
                    className="text-[13px] font-medium leading-snug"
                    style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    {mod}
                  </Link>
                  <span className="text-[12px] font-semibold text-right" style={{ color: done ? "#16a34a" : "#9ca3af" }}>
                    {loading ? "…" : done ? "100%" : "0%"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Overall progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-[12px] text-gray-500 mb-1">
              <span>Overall Progress</span>
              <span>{loading ? "…" : `${Math.round((completedCount / modules.length) * 100)}%`}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completedCount / modules.length) * 100}%`,
                  background: "linear-gradient(90deg,#131936,#C6BFB2)",
                }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mb-5" />

          {/* Navigation */}
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner/documents")}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-300 text-gray-600"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => router.push("/driver/onboarding/partner/contract")}
              className="flex-1 py-3 rounded-xl text-white font-bold text-[14px]"
              style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
            >
              Next
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
