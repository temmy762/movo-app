"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/onboarding/welcome");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Logo — top 55% */}
      <div className="flex items-center justify-center" style={{ height: "55%" }}>
        <div className="relative w-64 h-64 sm:w-72 sm:h-72">
          <Image
            src="/images/logo/logo-stacked-navy.svg"
            alt="MOVO Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Vehicle image — bottom 45%, fully visible */}
      <div className="relative w-full" style={{ height: "45%" }}>
        <Image
          src="/images/splash2 1.png"
          alt="Luxury Vehicles"
          fill
          className="object-contain object-bottom"
          priority
        />
      </div>
    </div>
  );
}
