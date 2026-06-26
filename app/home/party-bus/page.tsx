"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartyBusPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/home"); }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-400 text-sm">Redirecting…</p>
    </div>
  );
}
