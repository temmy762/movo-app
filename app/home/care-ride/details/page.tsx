"use client";

/* Safe Ride booking — step 2 (the customer's vehicle) and step 3 (contact &
   authorization). Step 1 is the pickup screen, step 4 is Confirm & pay. */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import SafeRideSteps from "../../components/SafeRideSteps";
import { getSafeRideDraft, saveSafeRideDraft, type SafeRideVehicle } from "@/lib/safeRideDraft";

const MAKES = [
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ford", "Genesis", "GMC",
  "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus", "Lincoln", "Mazda",
  "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Porsche", "Ram", "Subaru", "Tesla", "Toyota",
  "Volkswagen", "Volvo",
];
const COLOURS = ["Black", "White", "Silver", "Grey", "Blue", "Red", "Green", "Brown", "Beige", "Gold", "Other"];
const YEARS = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() + 1 - i));

const inputCls = "w-full rounded-xl border border-gray-200 px-3.5 py-3 text-[14px] text-gray-900 bg-white focus:outline-none focus:border-[#131936]";
const labelCls = "block text-[12px] font-semibold text-gray-700 mb-1.5";

function DetailsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useCurrentUser();
  const [step, setStep] = useState<2 | 3>(2);
  const [error, setError] = useState<string | null>(null);

  const draft = getSafeRideDraft();
  const [vehicle, setVehicle] = useState<SafeRideVehicle>(draft.vehicle ?? {
    make: "", model: "", year: "", colour: "", plate: "", transmission: "Automatic",
  });
  const [roadworthy, setRoadworthy] = useState(!!draft.roadworthy);

  const [forSomeoneElse, setForSomeoneElse] = useState(draft.contact?.forSomeoneElse ?? false);
  const [riderName,  setRiderName]  = useState(draft.contact?.riderName ?? "");
  const [riderPhone, setRiderPhone] = useState(draft.contact?.riderPhone ?? "");
  const [receiptEmail, setReceiptEmail] = useState(draft.contact?.receiptEmail ?? "");
  const [ownsVehicle, setOwnsVehicle] = useState(!!draft.consented);
  const [authorizes,  setAuthorizes]  = useState(!!draft.consented);
  const [agreesTerms, setAgreesTerms] = useState(!!draft.consented);

  /* Prefill the account holder's details unless they're booking for someone else */
  useEffect(() => {
    if (!user) return;
    if (!forSomeoneElse) {
      setRiderName(n => n || `${user.firstName} ${user.lastName}`.trim());
      setRiderPhone(p => p || user.phone || "");
    }
    setReceiptEmail(e => e || user.email || "");
  }, [user, forSomeoneElse]);

  const setV = (k: keyof SafeRideVehicle, v: string) => setVehicle(prev => ({ ...prev, [k]: v }));

  const continueToContact = () => {
    setError(null);
    if (!vehicle.make.trim() || !vehicle.model.trim() || !vehicle.year || !vehicle.colour || !vehicle.plate.trim()) {
      setError("Please complete all vehicle details.");
      return;
    }
    if (!roadworthy) {
      setError("Please confirm the vehicle is roadworthy with a working seat belt for every occupant.");
      return;
    }
    saveSafeRideDraft({ vehicle: { ...vehicle, plate: vehicle.plate.trim().toUpperCase() }, roadworthy });
    setStep(3);
    window.scrollTo({ top: 0 });
  };

  const toggleSomeoneElse = (v: boolean) => {
    setForSomeoneElse(v);
    if (v) { setRiderName(""); setRiderPhone(""); }
    else if (user) { setRiderName(`${user.firstName} ${user.lastName}`.trim()); setRiderPhone(user.phone || ""); }
  };

  const reviewBooking = () => {
    setError(null);
    if (!riderName.trim() || !riderPhone.trim() || !receiptEmail.trim()) {
      setError("Please enter the rider's name, mobile number and an email for the receipt.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(receiptEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (riderPhone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid mobile number.");
      return;
    }
    if (!ownsVehicle || !authorizes || !agreesTerms) {
      setError("Please tick all three boxes to authorize your Safe Ride.");
      return;
    }
    saveSafeRideDraft({
      contact: { forSomeoneElse, riderName: riderName.trim(), riderPhone: riderPhone.trim(), receiptEmail: receiptEmail.trim() },
      consented: true,
    });
    router.push(`/home/ride/confirm?${params.toString()}`);
  };

  const Check = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 w-5 h-5 shrink-0 accent-[#131936]" />
      <span className="text-[13px] text-gray-700 leading-snug">{children}</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-body)" }}>
      <div className="w-full max-w-lg mx-auto px-5 pt-6 pb-28">
        <button type="button" onClick={() => (step === 3 ? setStep(2) : router.back())}
          className="no-hover-fx flex items-center gap-1 text-[14px] text-gray-500 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>

        <SafeRideSteps step={step} />

        {step === 2 ? (
          <>
            <h1 className="text-[24px] font-bold text-gray-900 mb-5">Your vehicle</h1>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Make *</label>
                <input list="movo-makes" value={vehicle.make} onChange={e => setV("make", e.target.value)} placeholder="e.g. Toyota" className={inputCls} />
                <datalist id="movo-makes">{MAKES.map(m => <option key={m} value={m} />)}</datalist>
              </div>
              <div>
                <label className={labelCls}>Model *</label>
                <input value={vehicle.model} onChange={e => setV("model", e.target.value)} placeholder="e.g. Corolla" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Year *</label>
                  <select value={vehicle.year} onChange={e => setV("year", e.target.value)} className={inputCls}>
                    <option value="">Select</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Colour *</label>
                  <select value={vehicle.colour} onChange={e => setV("colour", e.target.value)} className={inputCls}>
                    <option value="">Select</option>
                    {COLOURS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Licence plate *</label>
                <input value={vehicle.plate} onChange={e => setV("plate", e.target.value.toUpperCase())} placeholder="e.g. ABC 123" className={inputCls} />
              </div>
              <div>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100">
                  {(["Automatic", "Manual"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setV("transmission", t)}
                      className="no-hover-fx py-2.5 rounded-lg text-[13px] font-semibold"
                      style={vehicle.transmission === t ? { background: "#0A0A0F", color: "white" } : { color: "#374151" }}>
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Transmission determines chauffeur availability.</p>
              </div>
              <Check checked={roadworthy} onChange={setRoadworthy}>
                Vehicle is roadworthy and has a working seat belt for every occupant.
              </Check>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-bold text-gray-900 mb-5">Contact &amp; authorization</h1>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100">
                {[false, true].map(v => (
                  <button key={String(v)} type="button" onClick={() => toggleSomeoneElse(v)}
                    className="no-hover-fx py-2.5 rounded-lg text-[13px] font-semibold"
                    style={forSomeoneElse === v ? { background: "#0A0A0F", color: "white" } : { color: "#374151" }}>
                    {v ? "Someone else is riding" : "I'm riding"}
                  </button>
                ))}
              </div>
              <div>
                <label className={labelCls}>{forSomeoneElse ? "Rider's full name *" : "Full name *"}</label>
                <input value={riderName} onChange={e => setRiderName(e.target.value)} placeholder="Full name" className={inputCls} autoComplete={forSomeoneElse ? "off" : "name"} />
              </div>
              <div>
                <label className={labelCls}>{forSomeoneElse ? "Rider's mobile number *" : "Mobile number *"}</label>
                <input value={riderPhone} onChange={e => setRiderPhone(e.target.value)} placeholder="+1 204 555 0123" inputMode="tel" className={inputCls} autoComplete={forSomeoneElse ? "off" : "tel"} />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {forSomeoneElse ? "Your chauffeur will contact the rider on this number." : "Your chauffeur will use this number to reach you."}
                </p>
              </div>
              <div>
                <label className={labelCls}>Email for receipt *</label>
                <input value={receiptEmail} onChange={e => setReceiptEmail(e.target.value)} placeholder="you@example.com" inputMode="email" className={inputCls} autoComplete="email" />
              </div>
              <div className="flex flex-col gap-3 mt-1">
                <Check checked={ownsVehicle} onChange={setOwnsVehicle}>
                  I own this vehicle or have permission to authorize its use.
                </Check>
                <Check checked={authorizes} onChange={setAuthorizes}>
                  I authorize the assigned MOVO chauffeur to drive it for this booking.
                </Check>
                <Check checked={agreesTerms} onChange={setAgreesTerms}>
                  I agree to the <a href="/terms" target="_blank" className="underline">Terms</a> and Safe Ride consent.
                </Check>
              </div>
              <p className="text-[11px] text-gray-400">Required fields marked *; pickup instructions optional.</p>
            </div>
          </>
        )}

        {error && <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100">
        <div className="w-full max-w-lg mx-auto">
          <button type="button" onClick={step === 2 ? continueToContact : reviewBooking}
            className="w-full py-3.5 rounded-full text-white font-bold text-[15px] flex items-center justify-center gap-2"
            style={{ background: "#0A0A0F" }}>
            {step === 2 ? "Continue" : "Review booking"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SafeRideDetailsPage() {
  return (
    <Suspense>
      <DetailsContent />
    </Suspense>
  );
}
