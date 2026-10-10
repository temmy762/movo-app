/* Step indicator for the 4-step Safe Ride booking flow:
   1 Where → 2 Vehicle → 3 Contact & authorization → 4 Confirm & pay */

const GOLD = "#C6BFB2";

export default function SafeRideSteps({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[15px] font-bold shrink-0"
        style={{ background: GOLD }}>
        {step}
      </span>
      <div className="flex-1">
        <p className="text-[12px] font-bold tracking-wide text-gray-900 leading-none">MOVO</p>
        <p className="text-[11px] text-gray-500 mb-2">Safe Ride · Step {step} of 4</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map(n => (
            <span key={n} className="h-1 flex-1 rounded-full" style={{ background: n <= step ? GOLD : "#e5e7eb" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
