"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

const slides = [
  {
    image: "/images/02image.png",
    title: "Discover",
    subtitle: "Find inspiration, explore fascinating destination from our App.",
  },
  {
    image: "/images/03image.PNG",
    title: "Plan your Trip",
    subtitle: "Select destinations and start scheduling details for your trip.",
  },
  {
    image: "/images/04image.PNG",
    title: "Start your Trip",
    subtitle: "Enjoy! Relax and chilling memories Enjoy! Relax.",
  },
];

export default function WelcomePage() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      router.push("/onboarding/start");
    }
  };

  const handleSkip = () => {
    router.push("/onboarding/login");
  };

  const slide = slides[step];

  return (
    <div
      className="flex flex-col h-full bg-gradient-to-b from-white via-[#fdf8f5] to-[#fdf0ea]"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* Skip */}
      <div className="flex justify-end px-6 pt-3">
        <button
          onClick={handleSkip}
          className="text-[#e8586a] text-sm font-medium tracking-wide"
        >
          Skip
        </button>
      </div>

      {/* Top section — illustration */}
      <div className="flex items-center justify-center px-6" style={{ height: "48%" }}>
        <div className="relative w-full max-w-[280px] h-[220px]">
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Bottom section — text + dots + button */}
      <div className="flex flex-col items-center justify-start px-10" style={{ height: "52%" }}>
        <div className="text-center pt-2">
          <h2 className="text-[#1a1a2e] text-[26px] font-bold leading-tight">
            {slide.title}
          </h2>
          <p className="text-gray-400 text-[13px] leading-relaxed mt-1.5 max-w-[260px]">
            {slide.subtitle}
          </p>
        </div>

        <div className="flex justify-center items-center gap-2 pt-4 pb-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === step ? "bg-[#4566f5]" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next"
            className="no-hover-fx relative flex items-center justify-center w-[108px] h-[108px] cursor-pointer hover:scale-105 active:scale-95 transition-transform focus:outline-none"
          >
            <div className="absolute inset-0 rounded-full border-[1.5px] border-gray-200" />
            <div
              className="absolute inset-0 rounded-full border-[2.5px] border-transparent animate-spin"
              style={{
                animationDuration: "2s",
                animationTimingFunction: "linear",
                borderTopColor: "#a0a0a0",
                borderRightColor: "#d0d0d0",
              }}
            />
            <div className="relative w-[72px] h-[72px] z-10">
              <Image
                src="/images/Button.png"
                alt="Next"
                fill
                className="object-contain"
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
