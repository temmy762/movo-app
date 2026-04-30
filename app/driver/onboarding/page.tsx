import Image from "next/image";
import Link from "next/link";

export default function DriverSplashPage() {
  return (
    <div
      className="h-full flex flex-col bg-white"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {/* Logo area — top 50% */}
      <div className="flex flex-col items-center justify-center" style={{ flex: "0 0 50%" }}>
        <div className="relative w-72 h-72 sm:w-64 sm:h-64">
          <Image
            src="/images/image_1.png"
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

      {/* Log In button */}
      <div className="flex justify-center px-6 pb-10 pt-4">
        <Link
          href="/driver/onboarding/login"
          className="block w-full max-w-xs py-3.5 rounded-xl text-white font-bold text-[15px] text-center tracking-wide"
          style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
        >
          Log In
        </Link>
      </div>
    </div>
  );
}
