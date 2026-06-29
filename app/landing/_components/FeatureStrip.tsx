"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Clock3, Car, Headphones } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const C = {
  bg:    "#080808",
  text:  "#F0EAE0",
  muted: "rgba(240,234,224,0.42)",
  gold:  "#B09060",
  rule:  "rgba(240,234,224,0.07)",
  sans:  "var(--font-dm-sans), var(--font-inter), -apple-system, sans-serif",
  serif: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
};

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Car,         title: "Premium Fleet",           desc: "Every vehicle curated and maintained to the highest presentation standard." },
  { icon: ShieldCheck, title: "Vetted Chauffeurs",       desc: "Background-checked, licensed, and trained to Movo's exacting standard." },
  { icon: Clock3,      title: "Precision Scheduling",   desc: "Your time is non-negotiable. We arrive early so you arrive on time." },
  { icon: Headphones,  title: "24 / 7 Concierge",       desc: "Round-the-clock support for every booking, change, and request." },
];

export default function FeatureStrip() {
  return (
    <section style={{ background: C.bg, borderBottom: `1px solid ${C.rule}` }}>
      <div style={{ maxWidth: "1440px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              padding: "2.25rem clamp(1.5rem, 3vw, 2.5rem)",
              borderRight: i < FEATURES.length - 1 ? `1px solid ${C.rule}` : "none",
              display: "flex", flexDirection: "column", gap: "1rem",
            }}
          >
            <div style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid rgba(176,144,96,0.3)`, paddingBottom: "10px" }}>
              <Icon size={18} color={C.gold} strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontFamily: C.sans, fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", color: C.text, textTransform: "uppercase" as const, marginBottom: "8px" }}>{title}</div>
              <p style={{ margin: 0, fontFamily: C.sans, fontSize: "12.5px", fontWeight: 300, color: C.muted, lineHeight: 1.75 }}>{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
