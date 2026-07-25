"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DocState { fileName: string; uploaded: boolean }
interface FormData {
  dob: string; licenseNumber: string;
  vehicleMake: string; vehicleModel: string; vehicleYear: string;
  vehiclePlate: string; vehicleTier: string; vehicleColor: string;
  bankAccountName: string; bankInstitution: string;
  bankAccountNumber: string; bankRoutingNumber: string;
  signature: string;
}
interface Consents {
  gpsConsent: boolean; privacyPolicy: boolean;
  legalNotice: boolean; termsAccepted: boolean; contractSigned: boolean;
}
interface Docs { [key: string]: DocState }

// ── Constants ──────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 10;
const STEP_LABELS = [
  "Welcome", "Personal", "Vehicle", "Standards",
  "Test Assessment", "App Basics", "Safety", "Agreements", "Contract", "Review",
];
const VEHICLE_TIERS = ["Economy (Standard)", "Premium (Executive)", "First Class (Concierge)"];
const VEHICLE_COLORS = ["Black", "White", "Silver", "Grey", "Dark Blue", "Other"];
const VEHICLE_YEARS  = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i));

// ── Shared UI ──────────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
          Step {step} of {TOTAL_STEPS}
        </span>
        <span className="text-[11px] font-bold" style={{ color: "#131936" }}>
          {STEP_LABELS[step - 1]}
        </span>
      </div>
      <div className="w-full h-[5px] rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${((step) / TOTAL_STEPS) * 100}%`,
            background: "linear-gradient(90deg, #131936 0%, #C6BFB2 100%)",
          }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: i < step ? "linear-gradient(135deg,#131936,#C6BFB2)" : "#e5e7eb" }}
          />
        ))}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
        {required && <span className="text-red-400 mr-0.5">*</span>}{label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder = "", type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-purple-300 placeholder-gray-300 bg-gray-50"
      suppressHydrationWarning
    />
  );
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-700 focus:outline-none appearance-none bg-gray-50"
        suppressHydrationWarning
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function UploadBox({ label, docKey, docs, onUpload }: {
  label: string; docKey: string; docs: Docs; onUpload: (key: string, file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const doc = docs[docKey];
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="no-hover-fx w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all"
        style={{
          borderColor: doc?.uploaded ? "#22c55e" : "#e5e7eb",
          background: doc?.uploaded ? "#f0fdf4" : "#fafafa",
        }}
      >
        {doc?.uploaded ? (
          <>
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-[12px] text-green-600 font-medium truncate flex-1 text-left">{doc.fileName}</span>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
            </div>
            <span className="text-[12px] text-gray-400 flex-1 text-left">Tap to upload</span>
            <span className="text-[10px] text-gray-300">PDF, JPG, PNG</span>
          </>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(docKey, f); }}
        suppressHydrationWarning
      />
    </div>
  );
}

function Checkbox({ checked, onChange, children }: {
  checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="no-hover-fx flex items-start gap-3 w-full text-left p-3 rounded-xl border transition-all"
      style={{ borderColor: checked ? "#131936" : "#e5e7eb", background: checked ? "#f5f0ff" : "#fafafa" }}>
      <div className="w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all"
        style={{ borderColor: checked ? "#131936" : "#d1d5db", background: checked ? "#131936" : "white" }}>
        {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>}
      </div>
      <span className="text-[12px] text-gray-700 leading-relaxed">{children}</span>
    </button>
  );
}

function OptionCard({ selected, onClick, icon, title, description }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className="no-hover-fx flex items-start gap-3 w-full text-left p-4 rounded-xl border transition-all"
      style={{ borderColor: selected ? "#131936" : "#e5e7eb", background: selected ? "#f5f0ff" : "#fafafa" }}>
      <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
        style={{ background: selected ? "linear-gradient(135deg,#131936,#C6BFB2)" : "#e5e7eb" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-gray-900">{title}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <div className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center border-2 transition-all"
        style={{ borderColor: selected ? "#131936" : "#d1d5db", background: selected ? "#131936" : "white" }}>
        {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>}
      </div>
    </button>
  );
}

function ConsentCard({ icon, title, description, required = true }: {
  icon: React.ReactNode; title: string; description: string; required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg,#131936,#C6BFB2)" }}>
        {icon}
      </div>
      <div>
        <p className="text-[12px] font-semibold text-gray-900">{title}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        {required && <span className="text-[10px] font-semibold text-red-400">Required</span>}
      </div>
    </div>
  );
}

function InfoCard({ icon, title, items }: {
  icon: React.ReactNode; title: string; items: string[];
}) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: "linear-gradient(90deg,#13193610,#C6BFB210)" }}>
        <span>{icon}</span>
        <p className="text-[13px] font-bold text-gray-800">{title}</p>
      </div>
      <ul className="px-4 py-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: "linear-gradient(135deg,#131936,#C6BFB2)" }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ChauffeurOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [driverName, setDriverName] = useState("Chauffeur");
  const [vehicleOption, setVehicleOption] = useState<"OWN" | "RENT" | "">("");

  const [form, setForm] = useState<FormData>({
    dob: "", licenseNumber: "",
    vehicleMake: "", vehicleModel: "", vehicleYear: "",
    vehiclePlate: "", vehicleTier: "", vehicleColor: "",
    bankAccountName: "", bankInstitution: "", bankAccountNumber: "", bankRoutingNumber: "",
    signature: "",
  });

  const [consents, setConsents] = useState<Consents>({
    gpsConsent: false, privacyPolicy: false,
    legalNotice: false, termsAccepted: false, contractSigned: false,
  });

  const [docs, setDocs] = useState<Docs>({});
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [standards, setStandards] = useState(false);
  const [appBasics, setAppBasics] = useState(false);
  const [safetyReview, setSafetyReview] = useState(false);

  // Load saved progress on mount
  useEffect(() => {
    fetch("/api/driver/onboarding")
      .then(r => r.json())
      .then(data => {
        if (data.exists && data.onboarding) {
          const o = data.onboarding;
          if (o.currentStep > 1) setStep(o.currentStep);
          if (o.submittedAt) setSubmitted(true);
          if (o.vehicleOption) setVehicleOption(o.vehicleOption);
          setForm(prev => ({
            ...prev,
            dob:             o.dob             ?? "",
            licenseNumber:   o.licenseNumber   ?? "",
            vehicleMake:     o.vehicleMake     ?? "",
            vehicleModel:    o.vehicleModel    ?? "",
            vehicleYear:     o.vehicleYear     ?? "",
            vehiclePlate:    o.vehiclePlate    ?? "",
            vehicleTier:     o.vehicleTier     ?? "",
            vehicleColor:    o.vehicleColor    ?? "",
            bankAccountName: o.bankAccountName ?? "",
            bankInstitution: o.bankInstitution ?? "",
            bankAccountNumber: o.bankAccountNumber ?? "",
            bankRoutingNumber: o.bankRoutingNumber ?? "",
            signature:       o.signature       ?? "",
          }));
          if (o.gpsConsentAt)     setConsents(p => ({ ...p, gpsConsent: true }));
          if (o.privacyPolicyAt)  setConsents(p => ({ ...p, privacyPolicy: true }));
          if (o.legalNoticeAt)    setConsents(p => ({ ...p, legalNotice: true }));
          if (o.termsAcceptedAt)  setConsents(p => ({ ...p, termsAccepted: true }));
          if (o.contractSignedAt) setConsents(p => ({ ...p, contractSigned: true }));
          if (o.profilePhotoUrl)  setProfilePreview(o.profilePhotoUrl);
          // Restore document states
          if (o.documents?.length) {
            const restored: Docs = {};
            for (const doc of o.documents) {
              restored[doc.type] = { fileName: doc.fileName, uploaded: true };
            }
            setDocs(restored);
          }
        }
      })
      .catch(() => {});

    fetch("/api/driver/profile").then(r => r.json()).then(d => {
      if (d?.firstName) setDriverName(d.firstName);
    }).catch(() => {});
  }, []);

  const setField = useCallback((k: keyof FormData, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
  }, []);

  const setConsent = useCallback((k: keyof Consents, v: boolean) => {
    setConsents(p => ({ ...p, [k]: v }));
  }, []);

  const handleDocUpload = useCallback((key: string, file: File) => {
    setDocs(p => ({ ...p, [key]: { fileName: file.name, uploaded: false } }));
    if (key === "PROFILE_PHOTO") {
      const reader = new FileReader();
      reader.onload = e => setProfilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", key);
    fetch("/api/driver/onboarding/document/upload", { method: "POST", body: fd })
      .then(r => r.json())
      .then(d => {
        if (d.success) setDocs(p => ({ ...p, [key]: { fileName: file.name, uploaded: true } }));
      })
      .catch(() => setDocs(p => ({ ...p, [key]: { fileName: file.name, uploaded: true } })));
  }, []);

  const saveProgress = useCallback(async (extra: Record<string, unknown> = {}) => {
    setSaving(true);
    try {
      await fetch("/api/driver/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INDIVIDUAL",
          currentStep: step,
          vehicleOption: vehicleOption || undefined,
          ...form,
          ...consents,
          ...extra,
        }),
      });
    } catch { /* silent */ }
    setSaving(false);
  }, [step, form, consents, vehicleOption]);

  const next = useCallback(async (extra: Record<string, unknown> = {}) => {
    await saveProgress({ currentStep: step + 1, ...extra });
    setStep(p => Math.min(p + 1, TOTAL_STEPS));
    window.scrollTo(0, 0);
  }, [saveProgress, step]);

  const back = () => { setStep(p => Math.max(p - 1, 1)); window.scrollTo(0, 0); };

  const handleSubmit = async () => {
    setSaving(true);
    await fetch("/api/driver/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStep: 9, completedSteps: [1,2,3,4,5,6,7,8,9], submit: true }),
    });
    setSaving(false);
    setSubmitted(true);
  };

  const GradBtn = ({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving}
      className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] tracking-wide transition-opacity"
      style={{
        background: disabled || saving
          ? "#d1d5db"
          : "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)",
      }}
    >
      {saving ? "Saving…" : label}
    </button>
  );

  const OutlineBtn = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-3 rounded-xl font-bold text-[14px] border border-gray-200 text-gray-600"
    >
      {label}
    </button>
  );

  // ── Step renderers ────────────────────────────────────────────────────────────

  const stepContent = () => {
    switch (step) {
      // ─── Step 1: Welcome ────────────────────────────────────────────────────
      case 1:
        return (
          <div>
            <div className="rounded-2xl overflow-hidden mb-5"
              style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #131936 60%, #C6BFB2 100%)" }}>
              <div className="px-5 pt-6 pb-4">
                <p className="text-[11px] font-semibold text-purple-200 uppercase tracking-widest mb-1">
                  Chauffeur Onboarding
                </p>
                <h2 className="text-[22px] font-extrabold text-white leading-tight">
                  Welcome to Movo,<br />
                  <span className="text-yellow-300">{driverName}</span>
                </h2>
                <p className="text-[12px] text-purple-200 mt-2 leading-relaxed">
                  You&apos;re just 9 steps away from joining our elite chauffeur network.
                  This process takes approximately <strong className="text-white">15 minutes</strong>.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-px bg-white/10">
                {[["9", "Steps"], ["15min", "Avg. time"], ["24h", "Review"]].map(([val, lbl]) => (
                  <div key={lbl} className="bg-white/5 py-3 text-center">
                    <p className="text-[18px] font-black text-white">{val}</p>
                    <p className="text-[10px] text-purple-200">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[13px] font-bold text-gray-800 mb-3">What you&apos;ll complete</p>
            <div className="flex flex-col gap-2 mb-6">
              {[
                { n: "01", label: "Personal Verification", desc: "ID, license & background check" },
                { n: "02", label: "Vehicle Verification", desc: "Registration, insurance & photos" },
                { n: "03", label: "Standards & Training", desc: "Movo service standards" },
                { n: "04", label: "Safety Procedures", desc: "Emergency protocols & GPS consent" },
                { n: "05", label: "Agreements & Contract", desc: "Terms, privacy & digital signature" },
              ].map(item => (
                <div key={item.n} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[11px] font-black w-7 text-center shrink-0"
                    style={{ color: "#131936" }}>{item.n}</span>
                  <div>
                    <p className="text-[12px] font-semibold text-gray-800">{item.label}</p>
                    <p className="text-[11px] text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <GradBtn label="Begin Onboarding →" onClick={() => next()} />
          </div>
        );

      // ─── Step 2: Personal Verification ─────────────────────────────────────
      case 2:
        return (
          <div>
            <p className="text-[18px] font-extrabold text-gray-900 mb-1">Personal Verification</p>
            <p className="text-[12px] text-gray-400 mb-5">Upload your personal documents and verify your identity.</p>

            {/* Profile Photo */}
            <div className="flex flex-col items-center mb-5">
              <button
                type="button"
                className="no-hover-fx relative w-24 h-24 rounded-full overflow-hidden border-4 mb-2"
                style={{ borderColor: "#131936" }}
                onClick={() => document.getElementById("profile-upload")?.click()}
              >
                {profilePreview ? (
                  <Image src={profilePreview} alt="Profile" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#131936,#C6BFB2)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              </button>
              <p className="text-[11px] text-gray-400">Tap to upload profile photo</p>
              <input
                id="profile-upload"
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload("PROFILE_PHOTO", f); }}
                suppressHydrationWarning
              />
            </div>

            <div className="flex flex-col gap-4 mb-5">
              <Field label="Date of Birth" required>
                <TextInput type="date" value={form.dob} onChange={v => setField("dob", v)} />
              </Field>
              <Field label="Driver's License Number" required>
                <TextInput value={form.licenseNumber} onChange={v => setField("licenseNumber", v)} placeholder="e.g. A1234-56789" />
              </Field>
            </div>

            <p className="text-[12px] font-bold text-gray-700 mb-3">Required Documents</p>
            <div className="flex flex-col gap-3 mb-5">
              <UploadBox label="Driver's License" docKey="DRIVERS_LICENSE" docs={docs} onUpload={handleDocUpload} />
              <UploadBox label="Background Check" docKey="BACKGROUND_CHECK" docs={docs} onUpload={handleDocUpload} />
              <UploadBox label="Driver's Abstract" docKey="DRIVERS_ABSTRACT" docs={docs} onUpload={handleDocUpload} />
              <UploadBox label="Proof of Work Eligibility" docKey="WORK_ELIGIBILITY" docs={docs} onUpload={handleDocUpload} />
            </div>

            <div className="flex gap-3">
              <OutlineBtn label="← Back" onClick={back} />
              <div className="flex-1">
                <GradBtn 
                  label="Next →" 
                  onClick={() => next()} 
                  disabled={!form.dob || !form.licenseNumber || !docs.DRIVERS_LICENSE?.uploaded || !docs.BACKGROUND_CHECK?.uploaded || !docs.DRIVERS_ABSTRACT?.uploaded || !docs.WORK_ELIGIBILITY?.uploaded} 
                />
              </div>
            </div>
          </div>
        );

      // ─── Step 3: Vehicle ────────────────────────────────────────────────────
      case 3:
        return (
          <div>
            <p className="text-[18px] font-extrabold text-gray-900 mb-1">Vehicle</p>
            <p className="text-[12px] text-gray-400 mb-5">Tell us how you&apos;ll be driving with Movo.</p>

            <div className="flex flex-col gap-3 mb-5">
              <OptionCard
                selected={vehicleOption === "OWN"}
                onClick={() => setVehicleOption("OWN")}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>}
                title="I Have My Own Vehicle"
                description="Provide your vehicle details and documents for verification."
              />
              <OptionCard
                selected={vehicleOption === "RENT"}
                onClick={() => setVehicleOption("RENT")}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><circle cx="8" cy="15" r="4" /><path d="M10.5 12.5L19 4l2 2-1.5 1.5L21 9l-2.5 2.5-2-2L15 11" /></svg>}
                title="Rent a Vehicle from Movo"
                description="No car of your own? Rent an approved vehicle from Movo once your application is approved."
              />
            </div>

            {vehicleOption === "OWN" && (
              <>
                <div className="flex flex-col gap-4 mb-5">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Make" required>
                      <TextInput value={form.vehicleMake} onChange={v => setField("vehicleMake", v)} placeholder="e.g. Mercedes" />
                    </Field>
                    <Field label="Model" required>
                      <TextInput value={form.vehicleModel} onChange={v => setField("vehicleModel", v)} placeholder="e.g. S-Class" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Year" required>
                      <SelectInput value={form.vehicleYear} onChange={v => setField("vehicleYear", v)} options={VEHICLE_YEARS} />
                    </Field>
                    <Field label="Color" required>
                      <SelectInput value={form.vehicleColor} onChange={v => setField("vehicleColor", v)} options={VEHICLE_COLORS} />
                    </Field>
                  </div>
                  <Field label="License Plate" required>
                    <TextInput value={form.vehiclePlate} onChange={v => setField("vehiclePlate", v)} placeholder="e.g. ABC-1234" />
                  </Field>
                  <Field label="Vehicle Class" required>
                    <SelectInput value={form.vehicleTier} onChange={v => setField("vehicleTier", v)} options={VEHICLE_TIERS} />
                  </Field>
                </div>

                <p className="text-[12px] font-bold text-gray-700 mb-3">Vehicle Documents</p>
                <div className="flex flex-col gap-3 mb-5">
                  <UploadBox label="Vehicle Registration" docKey="VEHICLE_REGISTRATION" docs={docs} onUpload={handleDocUpload} />
                  <UploadBox label="Vehicle Insurance" docKey="VEHICLE_INSURANCE" docs={docs} onUpload={handleDocUpload} />
                  <UploadBox label="Vehicle Photos (interior/exterior)" docKey="VEHICLE_PHOTO" docs={docs} onUpload={handleDocUpload} />
                </div>
              </>
            )}

            {vehicleOption === "RENT" && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 mb-5">
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  You&apos;ll be able to browse and rent an available Movo vehicle from your chauffeur dashboard once your application is approved.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <OutlineBtn label="← Back" onClick={back} />
              <div className="flex-1">
                <GradBtn
                  label="Next →"
                  onClick={() => next({ vehicleOption })}
                  disabled={
                    !vehicleOption ||
                    (vehicleOption === "OWN" && (!form.vehicleMake || !form.vehiclePlate || !docs.VEHICLE_REGISTRATION?.uploaded || !docs.VEHICLE_INSURANCE?.uploaded || !docs.VEHICLE_PHOTO?.uploaded))
                  }
                />
              </div>
            </div>
          </div>
        );

      // ─── Step 4: Standards & Expectations ──────────────────────────────────
      case 4:
        return (
          <div>
            <p className="text-[18px] font-extrabold text-gray-900 mb-1">Chauffeur Standards</p>
            <p className="text-[12px] text-gray-400 mb-4">Please read and acknowledge our service standards before proceeding.</p>

            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>}
              title="Professional Appearance"
              items={[
                "Dark, clean, wrinkle-free business attire at all times",
                "Well-groomed appearance — hair, nails, and hygiene standards",
                "No strong fragrances; subtle professional presentation",
                "Polished shoes — no trainers or casual footwear",
              ]}
            />
            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
              title="Client Service Standards"
              items={[
                "Always greet clients by name and open vehicle doors",
                "Maintain a quiet, professional environment unless client initiates",
                "Assist with luggage promptly and carefully",
                "Zero tolerance for phone use while driving",
                "Arrive 5–10 minutes early for every booking",
              ]}
            />
            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
              title="Punctuality & Reliability"
              items={[
                "Accepting a booking is a firm commitment — no no-shows",
                "Notify Movo immediately if unavoidable delays occur",
                "Three cancellations within 30 days triggers account review",
              ]}
            />
            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>}
              title="Vehicle Cleanliness"
              items={[
                "Vehicle must be spotless before every trip — interior and exterior",
                "No food, strong odours, or personal items visible in the vehicle",
                "Offer water and a fresh ambient setting for every client",
              ]}
            />

            <div className="mt-4 mb-5">
              <Checkbox checked={standards} onChange={setStandards}>
                I have read and understood the Movo Chauffeur Standards & Expectations. I commit to upholding these standards on every trip.
              </Checkbox>
            </div>

            <div className="flex gap-3">
              <OutlineBtn label="← Back" onClick={back} />
              <div className="flex-1">
                <GradBtn label="Next →" onClick={() => next()} disabled={!standards} />
              </div>
            </div>
          </div>
        );

      // ─── Step 5: Test Assessment ──────────────────────────────────────────────
      case 5:
        return (
          <div>
            <p className="text-[18px] font-extrabold text-gray-900 mb-1">Standards Assessment</p>
            <p className="text-[12px] text-gray-400 mb-5">Test your knowledge of Movo standards and procedures.</p>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-8 flex flex-col items-center text-center mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-3">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
              <p className="text-[13px] font-semibold text-gray-500 mb-2">Assessment Coming Soon</p>
              <p className="text-[11px] text-gray-400">The Movo team is preparing your assessment. You can mark this as complete for now.</p>
            </div>

            <div className="mb-5">
              <Checkbox checked={standards} onChange={setStandards}>
                I understand the assessment will be available soon. I have reviewed the standards and am ready to proceed.
              </Checkbox>
            </div>

            <div className="flex gap-3">
              <OutlineBtn label="← Back" onClick={back} />
              <div className="flex-1">
                <GradBtn label="Next →" onClick={() => next()} disabled={!standards} />
              </div>
            </div>
          </div>
        );

      // ─── Step 6: App Basics ─────────────────────────────────────────────────
      case 6:
        return (
          <div>
            <p className="text-[18px] font-extrabold text-gray-900 mb-1">Chauffeur App Basics</p>
            <p className="text-[12px] text-gray-400 mb-4">Familiarise yourself with how the Movo app works.</p>

            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>}
              title="Going Online & Accepting Rides"
              items={[
                "Toggle your status to Online on the home screen to begin receiving bookings",
                "Incoming bookings show client name, pickup location, and trip details",
                "You have 30 seconds to accept before the ride is offered to another chauffeur",
                "Declining too frequently will affect your availability ranking",
              ]}
            />
            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>}
              title="Navigation & Route"
              items={[
                "Always follow the assigned pickup and drop-off route",
                "Route deviations must be communicated to the client and logged",
                "Use the in-app map for live turn-by-turn navigation",
              ]}
            />
            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
              title="Communication with Clients"
              items={[
                "Use only the in-app messaging system to contact clients",
                "Do not share your personal contact details with clients",
                "Be responsive — unread messages must be addressed before departure",
              ]}
            />
            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
              title="Earnings & Payments"
              items={[
                "All payments are processed by Movo — no cash handling required",
                "Earnings are deposited to your registered bank account weekly",
                "View trip history, earnings, and ratings in the Wallet section",
              ]}
            />

            <div className="mt-4 mb-5">
              <Checkbox checked={appBasics} onChange={setAppBasics}>
                I have reviewed and understood the Chauffeur App Basics. I am ready to operate the app professionally.
              </Checkbox>
            </div>

            <div className="flex gap-3">
              <OutlineBtn label="← Back" onClick={back} />
              <div className="flex-1">
                <GradBtn label="Next →" onClick={() => next()} disabled={!appBasics} />
              </div>
            </div>
          </div>
        );

      // ─── Step 7: Safety & Emergency ─────────────────────────────────────────
      case 7:
        return (
          <div>
            <p className="text-[18px] font-extrabold text-gray-900 mb-1">Safety & Emergency Procedures</p>
            <p className="text-[12px] text-gray-400 mb-4">Your safety and your clients' safety is our top priority.</p>

            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
              title="Emergency Contacts & Protocols"
              items={[
                "In a life-threatening emergency, call 911 (or local emergency number) immediately",
                "Use the in-app SOS button to alert Movo dispatch in real time",
                "Pull to a safe location before making emergency calls while driving",
              ]}
            />
            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
              title="Accident Procedures"
              items={[
                "Ensure all parties are safe before contacting Movo",
                "Do not admit fault or liability at the scene",
                "Document the incident with photos and submit via the in-app incident report",
                "Movo's support team is available 24/7 for guidance",
              ]}
            />
            <InfoCard
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
              title="Incident Reporting"
              items={[
                "Use the in-app 'Report Incident' button during or after any trip concern",
                "Include a clear description and any relevant information",
                "Movo may trigger an AI-assisted review or assign a case manager",
              ]}
            />

            <div className="p-4 rounded-xl border-2 mb-4" style={{ borderColor: "#131936", background: "#f5f0ff" }}>
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#131936" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <p className="text-[12px] font-bold" style={{ color: "#131936" }}>GPS Tracking Notice</p>
              </div>
              <p className="text-[12px] text-gray-600 leading-relaxed">
                Movo uses <strong>real-time GPS tracking</strong> during active trips for client safety, route verification, and dispute resolution. Location data is stored securely and used only for operational and safety purposes. You may review our Privacy Policy for full details.
              </p>
            </div>

            <div className="mt-2 mb-5">
              <Checkbox checked={safetyReview} onChange={setSafetyReview}>
                I have read and understood the Safety & Emergency Procedures and acknowledge the GPS tracking notice.
              </Checkbox>
            </div>

            <div className="flex gap-3">
              <OutlineBtn label="← Back" onClick={back} />
              <div className="flex-1">
                <GradBtn label="Next →" onClick={() => next()} disabled={!safetyReview} />
              </div>
            </div>
          </div>
        );

      // ─── Step 8: Agreement Summary (consents) ───────────────────────────────
      case 8:
        return (
          <div>
            <p className="text-[18px] font-extrabold text-gray-900 mb-1">Agreement Summary</p>
            <p className="text-[12px] text-gray-400 mb-4">
              Please review and acknowledge each of the following before signing the full contract.
            </p>

            <div className="flex flex-col gap-3 mb-5">
              <ConsentCard
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>}
                title="GPS Tracking Consent"
                description="I consent to real-time GPS tracking of my location during active trips for client safety, navigation, and dispute resolution purposes."
              />
              <Checkbox checked={consents.gpsConsent} onChange={v => setConsent("gpsConsent", v)}>
                I consent to GPS tracking during active trips as described above.
              </Checkbox>

              <ConsentCard
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
                title="Privacy Policy Acknowledgement"
                description="Movo collects and processes personal data in accordance with applicable privacy laws. Your data is used solely for operational, safety, and payment purposes."
              />
              <Checkbox checked={consents.privacyPolicy} onChange={v => setConsent("privacyPolicy", v)}>
                I have read and accept the Movo Privacy Policy.
              </Checkbox>

              <ConsentCard
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>}
                title="Legal Notice Acknowledgement"
                description="You are registering as an independent chauffeur. Movo is a technology platform and does not constitute an employment relationship."
              />
              <Checkbox checked={consents.legalNotice} onChange={v => setConsent("legalNotice", v)}>
                I acknowledge the legal notice regarding my status as an independent contractor.
              </Checkbox>

              <ConsentCard
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                title="Terms & Conditions"
                description="By joining Movo, you agree to abide by our Chauffeur Terms & Conditions including the code of conduct, payment terms, and cancellation policy."
              />
              <Checkbox checked={consents.termsAccepted} onChange={v => setConsent("termsAccepted", v)}>
                I accept the Movo Chauffeur Terms & Conditions.
              </Checkbox>
            </div>

            <div className="flex gap-3">
              <OutlineBtn label="← Back" onClick={back} />
              <div className="flex-1">
                <GradBtn
                  label="Next →"
                  onClick={() => next({ gpsConsent: consents.gpsConsent, privacyPolicy: consents.privacyPolicy, legalNotice: consents.legalNotice, termsAccepted: consents.termsAccepted })}
                  disabled={!consents.gpsConsent || !consents.privacyPolicy || !consents.legalNotice || !consents.termsAccepted}
                />
              </div>
            </div>
          </div>
        );

      // ─── Step 9: Contract & Signature ───────────────────────────────────────
      case 9:
        return (
          <div>
            <p className="text-[18px] font-extrabold text-gray-900 mb-1">Chauffeur Agreement</p>
            <p className="text-[12px] text-gray-400 mb-4">Read the full agreement and sign with your legal name.</p>

            <div className="border border-gray-200 rounded-xl mb-4 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100"
                style={{ background: "linear-gradient(90deg,#13193608,#C6BFB208)" }}>
                <p className="text-[12px] font-bold text-gray-800">Chauffeur Services Agreement</p>
                <p className="text-[11px] text-gray-400">Movo · Independent Chauffeur</p>
              </div>
              <div className="px-4 py-4 max-h-52 overflow-y-auto">
                <p className="text-[11px] text-gray-600 leading-relaxed space-y-2">
                  This Agreement is entered into between <strong>Movo</strong> (&quot;Platform&quot;) and the
                  individual chauffeur (&quot;Chauffeur&quot;) registering through this onboarding process.<br /><br />
                  <strong>1. Independent Contractor Status.</strong> The Chauffeur operates as an independent contractor.
                  Nothing in this Agreement creates an employer-employee relationship, partnership, or agency.<br /><br />
                  <strong>2. Service Standards.</strong> Chauffeur agrees to uphold all Movo service standards
                  including appearance, punctuality, vehicle maintenance, and client interaction protocols.<br /><br />
                  <strong>3. GPS & Data Consent.</strong> Chauffeur consents to real-time GPS tracking during active
                  trips. Location data is retained for 90 days for safety and dispute resolution purposes.<br /><br />
                  <strong>4. Payments.</strong> Movo will remit earnings to the Chauffeur&apos;s registered bank
                  account on a weekly basis after applicable platform fees are deducted.<br /><br />
                  <strong>5. Conduct.</strong> Harassment, discrimination, or unsafe driving will result in immediate
                  suspension and potential legal action.<br /><br />
                  <strong>6. Termination.</strong> Either party may terminate this agreement with 14 days written notice.
                  Movo reserves the right to immediately suspend accounts for policy violations.<br /><br />
                  <strong>7. Governing Law.</strong> This agreement is governed by the laws of the applicable jurisdiction.
                </p>
              </div>
            </div>

            <UploadBox label="Banking / Payout Information Document (Optional)" docKey="BANKING_INFO" docs={docs} onUpload={handleDocUpload} />

            <div className="mt-4 flex flex-col gap-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account Holder Name" required>
                  <TextInput value={form.bankAccountName} onChange={v => setField("bankAccountName", v)} placeholder="Full legal name" />
                </Field>
                <Field label="Bank / Institution" required>
                  <TextInput value={form.bankInstitution} onChange={v => setField("bankInstitution", v)} placeholder="e.g. RBC" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account Number" required>
                  <TextInput value={form.bankAccountNumber} onChange={v => setField("bankAccountNumber", v)} placeholder="•••• •••• ••••" />
                </Field>
                <Field label="Routing / Transit #">
                  <TextInput value={form.bankRoutingNumber} onChange={v => setField("bankRoutingNumber", v)} placeholder="e.g. 004-12345" />
                </Field>
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 mb-3" style={{ borderColor: "#C6BFB2", background: "#fffbeb" }}>
              <p className="text-[11px] font-bold text-yellow-700 mb-1">Digital Signature</p>
              <p className="text-[11px] text-yellow-600 mb-2">
                Type your full legal name below to sign this agreement. By signing, you confirm you have read and agree to all terms.
              </p>
              <input
                type="text"
                value={form.signature}
                onChange={e => setField("signature", e.target.value)}
                placeholder="Your full legal name"
                className="w-full border border-yellow-300 rounded-lg px-3 py-2.5 text-[13px] text-gray-800 focus:outline-none bg-white"
                style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                suppressHydrationWarning
              />
            </div>

            <div className="mb-5">
              <Checkbox checked={consents.contractSigned} onChange={v => setConsent("contractSigned", v)}>
                By typing my name above, I confirm I have read, understood, and agree to the Movo Chauffeur Agreement in its entirety.
              </Checkbox>
            </div>

            <div className="flex gap-3">
              <OutlineBtn label="← Back" onClick={back} />
              <div className="flex-1">
                <GradBtn
                  label="Submit Application →"
                  onClick={() => next({ contractSigned: true })}
                  disabled={!form.signature.trim() || !consents.contractSigned || !form.bankAccountName}
                />
              </div>
            </div>
          </div>
        );

      // ─── Step 10: Final Review & Approval ────────────────────────────────────
      case 10: {
        const docTypes = vehicleOption === "RENT"
          ? ["PROFILE_PHOTO", "DRIVERS_LICENSE", "BACKGROUND_CHECK", "DRIVERS_ABSTRACT", "WORK_ELIGIBILITY"]
          : ["PROFILE_PHOTO", "DRIVERS_LICENSE", "BACKGROUND_CHECK", "DRIVERS_ABSTRACT", "WORK_ELIGIBILITY", "VEHICLE_REGISTRATION", "VEHICLE_INSURANCE", "VEHICLE_PHOTO"];
        const docLabels: Record<string, string> = {
          PROFILE_PHOTO: "Profile Photo", DRIVERS_LICENSE: "Driver's License",
          BACKGROUND_CHECK: "Background Check", DRIVERS_ABSTRACT: "Driver's Abstract",
          WORK_ELIGIBILITY: "Work Eligibility", VEHICLE_REGISTRATION: "Vehicle Registration",
          VEHICLE_INSURANCE: "Vehicle Insurance", VEHICLE_PHOTO: "Vehicle Photos",
        };
        const uploadedCount = docTypes.filter(t => docs[t]?.uploaded).length;

        const checkItems = [
          { label: "Personal information", ok: !!form.dob && !!form.licenseNumber },
          { label: "Vehicle information", ok: vehicleOption === "RENT" || (!!form.vehicleMake && !!form.vehiclePlate) },
          { label: "Documents uploaded", ok: uploadedCount === docTypes.length, note: `${uploadedCount}/${docTypes.length}` },
          { label: "Chauffeur standards acknowledged", ok: standards },
          { label: "App basics reviewed", ok: appBasics },
          { label: "Safety procedures reviewed", ok: safetyReview },
          { label: "GPS consent", ok: consents.gpsConsent },
          { label: "Privacy policy accepted", ok: consents.privacyPolicy },
          { label: "Legal notice acknowledged", ok: consents.legalNotice },
          { label: "Terms & conditions accepted", ok: consents.termsAccepted },
          { label: "Contract signed", ok: consents.contractSigned && !!form.signature },
          { label: "Banking information", ok: !!form.bankAccountName },
        ];

        const allDone = checkItems.every(i => i.ok);

        if (submitted) {
          return (
            <div className="flex flex-col items-center py-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                style={{ background: "linear-gradient(135deg,#131936,#C6BFB2)" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-[22px] font-extrabold text-gray-900 mb-2 text-center">Application Submitted!</p>
              <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-6 max-w-xs">
                Your Movo chauffeur application is under review. Our team will contact you within <strong>24–48 hours</strong>.
              </p>
              <div className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 mb-6">
                <p className="text-[12px] font-bold text-gray-700 mb-2">What happens next?</p>
                <ul className="space-y-2">
                  {["Our team will review your documents", "A background verification will be initiated", "You'll receive an email confirmation within 24h", "Account activation follows approval"].map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: "linear-gradient(135deg,#131936,#C6BFB2)" }} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => router.push("/driver/onboarding/login")}
                className="w-full py-3.5 rounded-xl text-white font-bold text-[15px]"
                style={{ background: "linear-gradient(90deg,#1a1a2e,#131936,#C6BFB2)" }}
              >
                Return to Login
              </button>
            </div>
          );
        }

        return (
          <div>
            <p className="text-[18px] font-extrabold text-gray-900 mb-1">Final Review</p>
            <p className="text-[12px] text-gray-400 mb-4">Review your application before submitting for admin approval.</p>

            <div className="flex flex-col gap-2 mb-5">
              {checkItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: item.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${item.ok ? "#bbf7d0" : "#fecaca"}` }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: item.ok ? "#22c55e" : "#f87171" }}>
                      {item.ok
                        ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>
                        : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      }
                    </div>
                    <span className="text-[12px] font-medium text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: item.ok ? "#16a34a" : "#dc2626" }}>
                    {item.note ?? (item.ok ? "Complete" : "Missing")}
                  </span>
                </div>
              ))}
            </div>

            {!allDone && (
              <p className="text-[12px] text-red-500 text-center mb-4">
                Please go back and complete all required items before submitting.
              </p>
            )}

            <div className="flex gap-3">
              <OutlineBtn label="← Back" onClick={back} />
              <div className="flex-1">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-[15px]"
                  style={{ background: saving ? "#d1d5db" : "linear-gradient(90deg,#1a1a2e,#131936,#C6BFB2)" }}
                >
                  {saving ? "Submitting…" : "Submit Application"}
                </button>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-white flex flex-col" style={{ fontFamily: "var(--font-body)" }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[480px] px-5">

          {/* Logo + heading */}
          <div className="flex items-center justify-center pt-6 pb-1">
            <div className="relative w-20 h-20">
              <Image src="/images/logo/logo-stacked-navy.svg" alt="MOVO" fill className="object-contain" priority />
            </div>
          </div>
          <h1 className="text-[14px] font-bold text-center mb-4"
            style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Chauffeur Onboarding
          </h1>

          {/* Progress */}
          <ProgressBar step={step} />

          {/* Step content */}
          <div className="pb-10">
            {stepContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
