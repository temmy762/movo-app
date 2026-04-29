"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function StarRating({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || rating;

  return (
    <div className="flex items-center justify-center gap-1 relative" style={{ height: 32 }}>
      {/* Unselected base row */}
      <Image
        src="/images/Group 40.png"
        alt="stars"
        width={140}
        height={28}
        className="select-none pointer-events-none"
        style={{ opacity: 1 }}
      />
      {/* Filled overlay clipped to active star count */}
      {active > 0 && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${(active / 5) * 100}%` }}
        >
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} width="24" height="24" viewBox="0 0 24 24" fill="#F5C518">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            ))}
          </div>
        </div>
      )}
      {/* Invisible click targets */}
      <div className="absolute inset-0 flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            className="flex-1 no-hover-fx"
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onRate(s)}
            aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

function RideCompletedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickup = searchParams.get("pickup") || "";
  const dropoff = searchParams.get("dropoff") || "";
  const car = searchParams.get("car") || "";

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  return (
    <div
      className="min-h-screen bg-gray-100 flex flex-col"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <span className="text-gray-500 text-[15px] font-semibold">Ride</span>
      </div>

      {/* White card */}
      <div className="px-4 pb-8 flex-1 flex flex-col">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center w-full max-w-sm md:max-w-md mx-auto">

          {/* Check mark */}
          <div className="mb-3 mt-2">
            <Image
              src="/images/Check Mark.png"
              alt="Ride Completed"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-[20px] font-extrabold text-gray-900 mb-5 text-center">
            Ride Completed
          </h1>

          {/* Stats row */}
          <div className="flex gap-2 w-full mb-5">
            {[
              {
                icon: "/images/Distance.png",
                value: "3.2 mi",
                label: "Distance",
              },
              {
                icon: "/images/Clock.png",
                value: "8 min",
                label: "Duration",
              },
              {
                icon: "/images/US Dollar.png",
                value: "$35.50",
                label: "Amount",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 flex flex-col items-center gap-1 bg-gray-50 rounded-xl py-3 px-1"
              >
                <Image
                  src={stat.icon}
                  alt={stat.label}
                  width={20}
                  height={20}
                  className="object-contain"
                />
                <span className="text-[13px] font-bold text-gray-900">{stat.value}</span>
                <span className="text-[10px] text-gray-400">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full border-t border-gray-100 mb-5" />

          {/* Driver section */}
          <div className="flex flex-col items-center w-full mb-5">
            <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-gray-100">
              <Image
                src="/images/Ellipse 10.png"
                alt="Driver"
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            </div>
            <p className="text-[14px] font-bold text-gray-900">Duice Kersagaard</p>
            <p className="text-[11px] text-gray-400 mb-3">Your Driver</p>

            {/* Star rating */}
            <StarRating rating={rating} onRate={setRating} />
            <p className="text-[11px] text-gray-400 mt-1.5">Rate your ride</p>
          </div>

          {/* Review textarea */}
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your experience!"
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-[13px] text-gray-700 placeholder-gray-400 resize-none focus:outline-none mb-5"
            style={{ border: "1.5px solid #c4b5fd" }}
          />

          {/* Book Again — gradient */}
          <button
            type="button"
            onClick={() => router.push("/home/ride")}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] mb-3 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="1" y="11" width="22" height="10" rx="2" />
              <path d="M4 11V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4" />
            </svg>
            Book Again
          </button>

          {/* Go Home — outlined */}
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full py-3.5 rounded-xl font-bold text-[14px] border-2 border-gray-200 text-gray-700 flex items-center justify-center gap-2"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
              <path d="M9 21V12h6v9" />
            </svg>
            Go Home
          </button>

        </div>
      </div>
    </div>
  );
}

export default function RideCompletedPage() {
  return (
    <Suspense>
      <RideCompletedContent />
    </Suspense>
  );
}
