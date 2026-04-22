"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

type PayMethod = "visa" | "paypal";

function ConfirmPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickup = searchParams.get("pickup") || "Pickup address";
  const dropoff = searchParams.get("dropoff") || "Destination";
  const carName = searchParams.get("car") || "Standard Ride";
  const [payment, setPayment] = useState<PayMethod>("visa");

  return (
    <div
      className="min-h-screen flex flex-col bg-white"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto px-5 md:px-10 pt-6 md:pt-10">

          {/* Back */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[14px] text-gray-500 mb-5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* Title */}
          <h1 className="text-center text-[22px] md:text-[28px] font-bold text-gray-900">Confirm &amp; Pay</h1>

          {/* Ride Summary */}
          <div className="mt-6">
            <p className="text-[14px] md:text-[15px] font-bold text-gray-900 mb-3">{carName}</p>

            <div className="relative flex flex-col gap-3">
              {/* Vertical connector */}
              <div className="absolute left-[9px] top-[18px] bottom-[18px] w-px bg-gray-200" />

              {/* Pickup address */}
              <div className="flex items-start gap-3">
                <div className="w-[18px] h-[18px] rounded-full shrink-0 z-10 mt-0.5 flex items-center justify-center" style={{ background: "#2D0A53" }}>
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] md:text-[14px] font-semibold text-gray-900 break-words">{pickup}</p>
                </div>
              </div>

              {/* Dropoff address */}
              <div className="flex items-start gap-3">
                <div className="w-[18px] h-[18px] rounded-full shrink-0 z-10 mt-0.5 flex items-center justify-center bg-red-500">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] md:text-[14px] font-semibold text-gray-900 break-words">{dropoff}</p>
                </div>
              </div>
            </div>

            <p className="text-[12px] md:text-[13px] text-gray-400 mt-2 ml-7">Arrives at 2:55 PM</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-5" />

          {/* Payment Method */}
          <div>
            <p className="text-[14px] md:text-[15px] font-bold text-gray-900 mb-3">Payment Method</p>

            <div className="flex flex-col gap-3">

              {/* Visa */}
              <button
                type="button"
                onClick={() => setPayment("visa")}
                className="no-hover-fx flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{
                  background:
                    payment === "visa"
                      ? "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #2D0A53 0%, #8B7500 100%) border-box"
                      : undefined,
                  borderColor: payment === "visa" ? "transparent" : "#e5e7eb",
                }}
              >
                {/* Visa logo placeholder */}
                <div className="w-10 h-6 rounded flex items-center justify-center shrink-0" style={{ background: "#1a1f71" }}>
                  <span className="text-white text-[10px] font-extrabold tracking-tighter">VISA</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[13px] md:text-[14px] font-semibold text-gray-900">&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;7373</p>
                  <p className="text-[11px] text-gray-400">Visa</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: payment === "visa" ? "#2D0A53" : "#d1d5db" }}
                >
                  {payment === "visa" && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#2D0A53" }} />
                  )}
                </div>
              </button>

              {/* PayPal */}
              <button
                type="button"
                onClick={() => setPayment("paypal")}
                className="no-hover-fx flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{
                  background:
                    payment === "paypal"
                      ? "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #2D0A53 0%, #8B7500 100%) border-box"
                      : undefined,
                  borderColor: payment === "paypal" ? "transparent" : "#e5e7eb",
                }}
              >
                {/* PayPal logo */}
                <div className="w-10 h-6 rounded flex items-center justify-center shrink-0" style={{ background: "#003087" }}>
                  <span className="text-[#009cde] text-[10px] font-extrabold">Pay</span>
                  <span className="text-white text-[10px] font-extrabold">Pal</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[13px] md:text-[14px] font-semibold text-gray-900">Paypal</p>
                  <p className="text-[11px] text-gray-400">Connected</p>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: payment === "paypal" ? "#2D0A53" : "#d1d5db" }}
                >
                  {payment === "paypal" && (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#2D0A53" }} />
                  )}
                </div>
              </button>

              {/* Add payment method */}
              <button
                type="button"
                className="flex items-center gap-1.5 text-[13px] font-medium mt-1"
                style={{ color: "#2D0A53" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Payment Method
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-5" />

          {/* Price breakdown */}
          <div
            className="rounded-xl p-4 flex flex-col gap-2 border border-transparent"
            style={{
              background:
                "linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #2D0A53 0%, #8B7500 100%) border-box",
            }}
          >
            <div className="flex justify-between items-center">
              <span className="text-[13px] md:text-[14px] text-gray-600">Ride Fare</span>
              <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">$30.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] md:text-[14px] text-gray-600">Service Fee</span>
              <span className="text-[13px] md:text-[14px] text-gray-900 font-medium">$5.50</span>
            </div>
            <div className="h-px bg-gray-100 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-[14px] md:text-[15px] font-bold text-gray-900">Total</span>
              <span className="text-[14px] md:text-[15px] font-bold text-gray-900">$35.50</span>
            </div>
          </div>

        </div>
      </div>

      {/* Confirm Booking button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100">
        <div className="w-full max-w-lg md:max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full py-3.5 rounded-full text-white font-bold text-[15px] tracking-wide"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPayPage() {
  return (
    <Suspense>
      <ConfirmPayContent />
    </Suspense>
  );
}
