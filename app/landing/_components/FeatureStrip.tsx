"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, ShieldCheck, Clock3, Headphones } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const GOLD = "#C8A878";

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Crown,       title: "Luxury Fleet",             desc: "A curated selection of\npremium vehicles" },
  { icon: ShieldCheck, title: "Professional Chauffeurs",  desc: "Highly trained, experienced\nand background-checked" },
  { icon: Clock3,      title: "Always On Time",           desc: "Punctual, reliable and\ncommitted to your time" },
  { icon: Headphones,  title: "24/7 Support",             desc: "Round-the-clock support\nwhenever you need us" },
];

function FeatureCard({ icon: Icon, title, desc, delay }: { icon: LucideIcon; title: string; desc: string; delay: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 200px",
        display: "flex", alignItems: "flex-start", gap: "1rem",
        padding: "1.75rem 1.5rem", borderRadius: "16px",
        background: hovered ? "rgba(200,168,120,0.04)" : "transparent",
        border: `1px solid ${hovered ? "rgba(200,168,120,0.12)" : "transparent"}`,
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        cursor: "default",
      }}
    >
      <div style={{
        flexShrink: 0, width: "48px", height: "48px", borderRadius: "50%",
        background: hovered ? "linear-gradient(135deg, #1c1510, #0A0A0A)" : "linear-gradient(135deg, #151515, #0A0A0A)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: hovered ? "0 8px 24px rgba(200,168,120,0.15)" : "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.3s ease",
      }}>
        <Icon size={20} color={GOLD} strokeWidth={1.5} />
      </div>
      <div>
        <h3 style={{ margin: "0 0 6px", fontFamily: "sans-serif", fontWeight: 600, fontSize: "14px", color: "#0A0A0A", letterSpacing: "0.01em" }}>{title}</h3>
        <p style={{ margin: 0, fontFamily: "sans-serif", fontSize: "12.5px", fontWeight: 400, color: "rgba(10,10,10,0.5)", lineHeight: 1.65, whiteSpace: "pre-line" }}>{desc}</p>
      </div>
    </motion.div>
  );
}

export default function FeatureStrip() {
  return (
    <section style={{ background: "#F6F4EF", padding: "clamp(2rem, 4vw, 3rem) clamp(1.5rem, 5vw, 5rem)", borderTop: "1px solid rgba(200,168,120,0.1)" }}>
      <div style={{ maxWidth: "1300px", margin: "0 auto", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {FEATURES.map(({ icon, title, desc }, i) => (
          <FeatureCard key={title} icon={icon} title={title} desc={desc} delay={1.1 + i * 0.1} />
        ))}
      </div>
    </section>
  );
}
