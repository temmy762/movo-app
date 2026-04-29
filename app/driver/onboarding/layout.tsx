import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MOVO PRIVÉ — Driver",
  description: "The art of sophisticated travel",
};

export default function DriverOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full flex flex-col">
      {children}
    </div>
  );
}
