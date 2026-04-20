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
      {/* Top half — logo centered */}
      <div className="flex items-center justify-center" style={{ height: "36%" }}>
        <div className="relative w-64 h-64">
          <Image
            src="/images/image_1.png"
            alt="MOVO PRIVÉ"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Bottom half — vehicle + button */}
      <div className="flex flex-col" style={{ height: "64%" }}>
        {/* Mobile image */}
        <div className="flex-1 relative sm:hidden">
          <Image
            src="/images/splash 1.png"
            alt="Luxury Vehicles"
            fill
            className="object-contain object-left-bottom"
            priority
          />
        </div>

        {/* Desktop image */}
        <div className="flex-1 relative hidden sm:block">
          <Image
            src="/images/splash2 1.png"
            alt="Luxury Vehicles"
            fill
            className="object-contain object-center"
            priority
          />
        </div>

        {/* CTA Button */}
        <div className="flex justify-center pb-10 px-8 mt-4">
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
    </div>
  );
}
