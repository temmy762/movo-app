"use client";

/* ── Permission explainer bottom-sheet ──────────────────────────────────
   Usage:
     <PermissionExplainer
       type="location-rider"
       onAllow={async () => { await requestLocation(); }}
       onDeny={() => setFallbackMode(true)}
       onClose={() => setShowExplainer(false)}
     />
   ─────────────────────────────────────────────────────────────────────── */

import { useState } from "react";

/* ── Permission type definitions ────────────────────────────────────────── */
export type PermissionType =
  | "location-rider"
  | "location-driver"
  | "notifications"
  | "camera"
  | "file-upload"
  | "microphone";

interface PermissionConfig {
  icon:        React.ReactNode;
  title:       string;
  body:        string;
  allowLabel:  string;
  denyLabel:   string;
  denyIsClose: boolean;
  deniedMsg:   string;
}

/* ── Icon helpers ────────────────────────────────────────────────────────── */
const LocationIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);
const BellIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const FolderIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);
const MicIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

/* ── Copy map ────────────────────────────────────────────────────────────── */
const CONFIG: Record<PermissionType, PermissionConfig> = {
  "location-rider": {
    icon:        <LocationIcon />,
    title:       "Allow Location Access",
    body:        "MOVO needs your location to show nearby cars, fill your pickup address, and calculate arrival times. Your location is only used during this session and never stored.",
    allowLabel:  "Use My Location",
    denyLabel:   "Enter Address Manually",
    denyIsClose: false,
    deniedMsg:   "Location access was denied. You can still book by typing your pickup address.",
  },
  "location-driver": {
    icon:        <LocationIcon />,
    title:       "Share Your Location",
    body:        "Your location is shared with riders while you're online. It updates in real time so riders can track your arrival. Location sharing stops the moment you go Offline.",
    allowLabel:  "Allow & Go Online",
    denyLabel:   "Cancel",
    denyIsClose: true,
    deniedMsg:   "Location access is required to go online and receive ride requests. Please enable it in your browser settings.",
  },
  "notifications": {
    icon:        <BellIcon />,
    title:       "Stay in the Loop",
    body:        "Get notified when your driver is on the way, nearby, or if your ride status changes. You can turn this off at any time in your browser settings.",
    allowLabel:  "Turn On Notifications",
    denyLabel:   "Not Now",
    denyIsClose: true,
    deniedMsg:   "Notifications are off. You can still track your ride from within the app.",
  },
  "camera": {
    icon:        <CameraIcon />,
    title:       "Camera Access",
    body:        "We need camera access to let you take photos directly — for document uploads during onboarding or to attach evidence to a support request.",
    allowLabel:  "Allow Camera",
    denyLabel:   "Upload from Files Instead",
    denyIsClose: false,
    deniedMsg:   "Camera access was denied. You can still upload files from your device.",
  },
  "file-upload": {
    icon:        <FolderIcon />,
    title:       "Upload a File",
    body:        "Select a photo or document from your device. This is used for identity verification or to attach evidence to a support request. Files are encrypted in transit.",
    allowLabel:  "Choose File",
    denyLabel:   "Skip",
    denyIsClose: true,
    deniedMsg:   "No file was selected.",
  },
  "microphone": {
    icon:        <MicIcon />,
    title:       "Microphone Access",
    body:        "Microphone access would allow you to send voice notes in support chats. This is optional — you can type your message instead at any time.",
    allowLabel:  "Allow Microphone",
    denyLabel:   "Type Instead",
    denyIsClose: false,
    deniedMsg:   "Microphone access was denied. You can still type your message.",
  },
};

/* ── Component ──────────────────────────────────────────────────────────── */
export interface PermissionExplainerProps {
  type:       PermissionType;
  onAllow:    () => Promise<void> | void;
  onDeny:     () => void;
  onClose?:   () => void;
}

export default function PermissionExplainer({
  type,
  onAllow,
  onDeny,
  onClose,
}: PermissionExplainerProps) {
  const cfg = CONFIG[type];
  const [view,    setView]    = useState<"explainer" | "denied" | "loading">("explainer");

  const handleAllow = async () => {
    setView("loading");
    try {
      await onAllow();
    } catch {
      setView("denied");
    }
  };

  const handleDeny = () => {
    if (cfg.denyIsClose) {
      onClose?.();
    } else {
      onDeny();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)", fontFamily: "var(--font-poppins)" }}
      onClick={(e) => { if (e.target === e.currentTarget) { onClose?.(); } }}
    >
      <div className="bg-white rounded-t-2xl w-full max-w-lg overflow-hidden">
        {/* handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-3">
          {/* ── Explainer view ── */}
          {(view === "explainer" || view === "loading") && (
            <>
              {/* icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg,#2D0A53,#8B7500)" }}
              >
                {cfg.icon}
              </div>

              <h2 className="text-[17px] font-bold text-gray-900 text-center mb-2">{cfg.title}</h2>
              <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-6">{cfg.body}</p>

              <button
                type="button"
                onClick={handleAllow}
                disabled={view === "loading"}
                className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] mb-3 disabled:opacity-60"
                style={{ background: "linear-gradient(90deg,#1a1a2e,#2D0A53,#8B7500)" }}
              >
                {view === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Requesting…
                  </span>
                ) : cfg.allowLabel}
              </button>

              <button
                type="button"
                onClick={handleDeny}
                disabled={view === "loading"}
                className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-[13px]"
              >
                {cfg.denyLabel}
              </button>
            </>
          )}

          {/* ── Denied / fallback view ── */}
          {view === "denied" && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h2 className="text-[17px] font-bold text-gray-900 text-center mb-2">Permission Denied</h2>
              <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-6">{cfg.deniedMsg}</p>

              <div className="bg-gray-50 rounded-xl p-3 mb-5">
                <p className="text-[11.5px] text-gray-400 text-center leading-relaxed">
                  To enable later, go to your <strong>browser settings</strong> → Site permissions → and allow access for this site.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { onDeny(); onClose?.(); }}
                className="w-full py-3 rounded-xl text-white font-bold text-[14px]"
                style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)" }}
              >
                {cfg.denyLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
