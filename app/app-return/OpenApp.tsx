"use client";

import { useEffect } from "react";

export default function OpenApp({ href }: { href: string }) {
  useEffect(() => { window.location.href = href; }, [href]);

  return (
    <a href={href}
      className="no-hover-fx mt-5 inline-block w-full py-3 rounded-xl text-white text-[14px] font-semibold"
      style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
      Open the Movo app
    </a>
  );
}
