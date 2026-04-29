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
        <div className="relative w-56 h-56 sm:w-52 sm:h-52">
          <Image
            src="/images/image_1.png"
            alt="MOVO PRIVÉ"
            fill
            className="object-contain"
            priority
          />
        </div>
        {/* Location pin */}
        <div className="mt-3 text-gray-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      </div>

      {/* Vehicle image — middle */}
      <div className="relative flex-1">
        <Image
          src="/images/party-bus.png"
          alt="Luxury vehicle"
          fill
          className="object-contain object-center"
          priority
        />
      </div>

      {/* Log In button */}
      <div className="px-6 pb-10 pt-4">
        <Link
          href="/driver/onboarding/login"
          className="block w-full py-3.5 rounded-xl text-white font-bold text-[15px] text-center tracking-wide"
          style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
        >
          Log In
        </Link>
      </div>
    </div>
  );
}
