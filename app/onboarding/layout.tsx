import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MOVO PRIVÉ",
  description: "The end of luxury car in Dubai",
};

export default function OnboardingLayout({
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
