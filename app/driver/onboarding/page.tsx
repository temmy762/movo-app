import Image from "next/image";
import Link from "next/link";

export default function DriverSplashPage() {
  return (
    <div
      className="h-full flex flex-col bg-white"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Logo area — top 50% */}
      <div className="flex flex-col items-center justify-center" style={{ flex: "0 0 50%" }}>
        <div className="relative w-72 h-72 sm:w-64 sm:h-64">
          <Image
            src="/images/logo/logo-stacked-navy.svg"
            alt="MOVO PRIVÉ"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Vehicle image — middle */}
      <div className="relative flex-1">
        <Image
          src="/images/splash2 1.png"
          alt="Luxury vehicle"
          fill
          className="object-contain object-center"
          priority
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col items-center gap-3 px-6 pb-10 pt-4">
        <Link
          href="/driver/onboarding/type"
          className="block w-full max-w-xs py-3.5 rounded-xl text-white font-bold text-[15px] text-center tracking-wide"
          style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
        >
          Join as Chauffeur
        </Link>
        <Link
          href="/driver/onboarding/login"
          className="block w-full max-w-xs py-3.5 rounded-xl font-bold text-[15px] text-center tracking-wide border"
          style={{ borderColor: "#131936", color: "#131936" }}
        >
          Log In
        </Link>
      </div>
    </div>
  );
}
