import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ConsentProvider } from "@/context/ConsentContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ConsentModal  from "@/components/consent/ConsentModal";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Movo Privé",
  description: "Premium chauffeur service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <head />
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <ConsentProvider>
            {children}
            <ConsentBanner />
            <ConsentModal />
          </ConsentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
