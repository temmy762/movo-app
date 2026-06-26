"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  SOUND_OPTIONS, AlertSoundId,
  getPreferredSound, setPreferredSound,
  previewSound, startAlertLoop,
} from "@/lib/driver-alert-sounds";

function SectionRow({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-hover-fx w-full flex items-center justify-between py-3 px-0 border-b border-gray-100 last:border-0"
    >
      <span className="text-[14px] font-medium text-gray-800">{label}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-0">{title}</p>
      <div className="bg-white rounded-xl px-4 divide-y divide-gray-100 shadow-sm">
        {children}
      </div>
    </div>
  );
}

export default function DriverProfilePage() {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useCurrentUser();
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [selectedSound, setSelectedSound] = useState<AlertSoundId>("chime");
  const [soundOpen, setSoundOpen] = useState(false);
  const [previewingId, setPreviewingId] = useState<AlertSoundId | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSelectedSound(getPreferredSound());
  }, []);

  const unlockCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext(); } catch { return null; }
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }, []);

  const handlePreview = useCallback((id: AlertSoundId) => {
    const ctx = unlockCtx();
    if (!ctx) return;
    previewStopRef.current?.();
    previewStopRef.current = null;
    setPreviewingId(id);
    const stop = startAlertLoop(id, ctx);
    previewStopRef.current = stop;
    /* auto-stop after one 3s sample */
    setTimeout(() => {
      stop();
      previewStopRef.current = null;
      setPreviewingId(null);
    }, 3000);
  }, [unlockCtx]);

  const handleSelectSound = useCallback((id: AlertSoundId) => {
    previewStopRef.current?.();
    previewStopRef.current = null;
    setPreviewingId(null);
    setSelectedSound(id);
    setPreferredSound(id);
    const ctx = unlockCtx();
    if (ctx) previewSound(id, ctx); // quick one-shot confirmation
  }, [unlockCtx]);

  useEffect(() => {
    fetch("/api/driver/ratings")
      .then((r) => r.json())
      .then((d) => {
        setAvgRating(d.avgRating ?? null);
        setTotalReviews(d.totalReviews ?? 0);
      })
      .catch(() => {});

    /* Load persisted profile photo */
    fetch("/api/driver/profile/photo")
      .then((r) => r.json())
      .then((d) => { if (d.photoUrl) setPhoto(d.photoUrl); })
      .catch(() => {});
  }, []);

  const handlePhotoChange = async (file: File) => {
    setUploading(true);
    /* Preview immediately */
    setPhoto(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append("photo", file);
    try {
      const res = await fetch("/api/driver/profile/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.photoUrl) setPhoto(data.photoUrl);
    } catch { /* keep preview */ }
    setUploading(false);
  };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/driver/onboarding/login");
  }

  return (
    <div className="min-h-full bg-gray-50" style={{ fontFamily: "var(--font-body)" }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <button className="no-hover-fx p-1 md:hidden" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
            <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-[18px] font-bold text-gray-900 leading-tight">{user?.firstName ?? "Driver"}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[12px] font-semibold text-gray-700">
              {avgRating !== null ? avgRating.toFixed(1) : "–"}
            </span>
            <span className="text-[11px] text-gray-400">
              ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
            </span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
          {photo ? (
            <img src={photo} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="px-4 pt-5 pb-8 max-w-2xl md:max-w-4xl md:mx-auto md:grid md:grid-cols-2 md:gap-6 md:pt-8">

        {/* Left col — photo upload */}
        <div>
          <div className="bg-white rounded-xl px-4 py-4 shadow-sm mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Add your photo</p>
                <p className="text-[11px] text-gray-400">Your photo will help guests recognize you.</p>
              </div>
            </div>
            <label
              className="text-[12px] font-bold cursor-pointer flex items-center gap-1.5"
              style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              {uploading ? (
                <span className="w-4 h-4 border-2 border-gray-300 border-t-[#131936] rounded-full animate-spin" style={{ WebkitTextFillColor: "initial" }} />
              ) : "UPLOAD"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoChange(f);
                }}
              />
            </label>
          </div>
        </div>

        {/* Right col — settings */}
        <div>
          <SectionGroup title="Vehicle">
            <SectionRow label="Default Vehicles" onClick={() => router.push("/driver/home/profile/vehicle")} />
          </SectionGroup>

          <SectionGroup title="Payments">
            <SectionRow label="Banking Details" onClick={() => router.push("/driver/home/profile/banking")} />
          </SectionGroup>

          {/* Notification sound picker */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-0">Notifications</p>
            <div className="bg-white rounded-xl px-4 shadow-sm divide-y divide-gray-100">
              <button
                type="button"
                onClick={() => setSoundOpen(v => !v)}
                className="no-hover-fx w-full flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-[14px] font-medium text-gray-800 text-left">Ride Request Sound</p>
                  <p className="text-[11px] text-gray-400 text-left">
                    {SOUND_OPTIONS.find(s => s.id === selectedSound)?.label ?? "Chime"}
                  </p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5"
                  className={`transition-transform ${soundOpen ? "rotate-90" : ""}`}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {soundOpen && (
                <div className="py-3 flex flex-col gap-2">
                  {SOUND_OPTIONS.map(opt => (
                    <div key={opt.id} className="flex items-center justify-between py-1">
                      <button
                        type="button"
                        onClick={() => handleSelectSound(opt.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        {/* Radio */}
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedSound === opt.id ? "border-[#131936]" : "border-gray-300"}`}>
                          {selectedSound === opt.id && <span className="w-2 h-2 rounded-full bg-[#131936]" />}
                        </span>
                        <span>
                          <p className="text-[13px] font-semibold text-gray-800">{opt.label}</p>
                          <p className="text-[11px] text-gray-400">{opt.description}</p>
                        </span>
                      </button>
                      {/* Preview button */}
                      <button
                        type="button"
                        onClick={() => handlePreview(opt.id)}
                        className="ml-3 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-gray-200"
                        style={previewingId === opt.id ? { background: "#131936" } : { background: "#f9fafb" }}
                      >
                        {previewingId === opt.id ? (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#131936" stroke="none">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SectionGroup title="Support">
            <SectionRow label="Help" onClick={() => router.push("/driver/home/profile/help")} />
            <SectionRow label="Share Feedback" onClick={() => router.push("/driver/home/profile/feedback")} />
          </SectionGroup>

          <SectionGroup title="Legal">
            <SectionRow label="Legal Notice" onClick={() => router.push("/driver/home/profile/legal")} />
            <SectionRow label="Privacy Policy" onClick={() => router.push("/driver/home/profile/privacy")} />
            <SectionRow label="GPS Tracking Policy" onClick={() => router.push("/driver/home/profile/gps-policy")} />
          </SectionGroup>
        </div>

        {/* Log out — full width */}
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px]"
            style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
          >
            Log out
          </button>
        </div>

      </div>
    </div>
  );
}
