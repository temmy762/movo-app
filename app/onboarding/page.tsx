import Image from "next/image";
import Link from "next/link";

export default function SplashPage() {
  return (
    <Link href="/onboarding/welcome" className="flex flex-col h-full bg-white">

      {/* Logo — top 55% */}
      <div className="flex items-center justify-center" style={{ height: "55%" }}>
        <div className="relative w-64 h-64 sm:w-72 sm:h-72">
          <Image
            src="/images/image_1.png"
            alt="MOVO PRIVÉ Logo"
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
    </Link>
  );
}
