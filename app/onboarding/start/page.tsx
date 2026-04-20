import Image from "next/image";
import Link from "next/link";

export default function StartPage() {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        background:
          "linear-gradient(180deg, #333333 0%, #2D0A53 30%, #8B7500 60%)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center pt-8">
        <div className="relative w-56 h-56">
          <Image
            src="/images/image_1.png"
            alt="MOVO PRIVÉ"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Vehicle image */}
      <div className="flex-1 relative">
        <Image
          src="/images/splash2 1.png"
          alt="Luxury Vehicles"
          fill
          className="object-contain object-bottom"
          priority
        />
      </div>

      {/* CTA Button */}
      <div className="flex justify-center pb-12 px-8">
        <Link
          href="/onboarding/login"
          className="flex items-center justify-center w-full max-w-[320px] py-4 rounded-full text-white font-bold tracking-[0.2em] uppercase text-sm"
          style={{
            background:
              "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)",
          }}
        >
          LETS GET STARTED
        </Link>
      </div>
    </div>
  );
}
