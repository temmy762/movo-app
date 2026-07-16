import type { Metadata } from "next";
import { FleetOnboardingProvider } from "./partner/provider";

export const metadata: Metadata = {
  title: "MOVO — Driver",
  description: "The art of sophisticated travel",
};

export default function DriverOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FleetOnboardingProvider>
      <div className="h-screen w-full flex flex-col">
        {children}
      </div>
    </FleetOnboardingProvider>
  );
}
