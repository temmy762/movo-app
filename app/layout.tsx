import type { Metadata } from "next";
import { Inter, DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { ConsentProvider } from "@/context/ConsentContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ConsentBanner from "@/components/consent/ConsentBanner";
import ConsentModal  from "@/components/consent/ConsentModal";
import { SocketProvider } from "@/context/SocketContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const poppins = { variable: "--font-poppins" };

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
      className={`${inter.variable} ${dmSans.variable} ${cormorant.variable} ${poppins.variable} h-full antialiased`}
    >
      <head />
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SocketProvider>
          <ThemeProvider>
            <ConsentProvider>
              {children}
              <ConsentBanner />
              <ConsentModal />
            </ConsentProvider>
          </ThemeProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
