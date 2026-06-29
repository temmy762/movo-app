"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, Crown } from "lucide-react";
import Link from "next/link";

const GOLD = "#C8A878";
const OFF_WHITE = "#F6F4EF";
const WARM_BEIGE = "#E7D8C4";

function HeroBadge() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "7px 16px", borderRadius: "100px",
          background: "rgba(200,168,120,0.08)",
          border: "1px solid rgba(200,168,120,0.28)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 0 20px rgba(200,168,120,0.08)",
          marginBottom: "1.75rem",
        }}
      >
        <span style={{ color: GOLD, fontSize: "10px" }}>✦</span>
        <span style={{ color: GOLD, fontSize: "11px", letterSpacing: "0.2em", fontFamily: "sans-serif", fontWeight: 500 }}>
          PREMIUM CHAUFFEUR SERVICE
        </span>
      </motion.div>
    </motion.div>
  );
}

function PrimaryButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href="/home/pickup">
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? `linear-gradient(135deg, ${WARM_BEIGE}, #d4c4a8)` : `linear-gradient(135deg, ${WARM_BEIGE}, #cbb99a)`,
          color: "#0A0A0A",
          padding: "14px 30px", borderRadius: "100px",
          border: "none", cursor: "pointer",
          fontFamily: "sans-serif", fontSize: "14px", fontWeight: 600, letterSpacing: "0.04em",
          display: "flex", alignItems: "center", gap: "10px",
          transition: "all 0.3s ease",
          transform: hovered ? "translateY(-2px) scale(1.03)" : "translateY(0) scale(1)",
          boxShadow: hovered ? "0 16px 40px rgba(200,168,120,0.3)" : "0 4px 20px rgba(200,168,120,0.15)",
        }}
      >
        Book a Ride
        <ArrowRight size={15} style={{ transform: hovered ? "translateX(4px)" : "translateX(0)", transition: "transform 0.3s" }} />
      </button>
    </Link>
  );
}

function SecondaryButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "transparent",
        color: hovered ? OFF_WHITE : "rgba(246,244,239,0.7)",
        padding: "14px 20px", borderRadius: "100px",
        border: "1px solid rgba(246,244,239,0.15)",
        cursor: "pointer", fontFamily: "sans-serif", fontSize: "14px", fontWeight: 400, letterSpacing: "0.04em",
        display: "flex", alignItems: "center", gap: "10px",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <span style={{
        width: "30px", height: "30px", borderRadius: "50%",
        border: `1px solid rgba(246,244,239,${hovered ? 0.35 : 0.2})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color 0.3s",
      }}>
        <Play size={10} fill={hovered ? OFF_WHITE : "rgba(246,244,239,0.7)"} color="transparent" style={{ marginLeft: "2px" }} />
      </span>
      Discover Movo
    </button>
  );
}

function VehicleScene() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Base atmospheric gradient */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a1208 0%, #231a0e 30%, #2c2216 55%, #1e1812 80%, #131010 100%)" }} />

      {/* Ceiling light rays */}
      {[35, 50, 65].map((left, i) => (
        <div key={i} style={{
          position: "absolute", top: 0, left: `${left}%`, width: "2px", height: "65%",
          background: `linear-gradient(180deg, rgba(200,168,120,${0.18 - i * 0.04}) 0%, transparent 100%)`,
          transform: "translateX(-50%)",
        }} />
      ))}

      {/* Ceiling glow */}
      <div style={{ position: "absolute", top: "-80px", left: "20%", right: "10%", height: "280px", background: "radial-gradient(ellipse at 50% 0%, rgba(200,168,120,0.12) 0%, transparent 70%)" }} />

      {/* Architectural vertical lines */}
      {[20, 38, 62, 80].map((left, i) => (
        <div key={i} style={{
          position: "absolute", top: 0, bottom: 0, left: `${left}%`, width: "1px",
          background: `linear-gradient(180deg, rgba(200,168,120,0.05) 0%, rgba(200,168,120,0.12) 40%, rgba(200,168,120,0.04) 100%)`,
        }} />
      ))}

      {/* Ambient glow */}
      <div style={{ position: "absolute", top: "15%", left: "20%", width: "60%", height: "55%", background: "radial-gradient(ellipse at 45% 60%, rgba(200,168,120,0.1) 0%, rgba(180,140,90,0.04) 40%, transparent 70%)" }} />

      {/* MOVO PRIVÉ branding */}
      <div style={{ position: "absolute", top: "22%", right: "8%", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", opacity: 0.45 }}>
        <Crown size={22} color={GOLD} strokeWidth={1} />
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", color: OFF_WHITE, fontSize: "16px", fontWeight: 700, letterSpacing: "0.14em", lineHeight: 1 }}>MOVO</div>
        <div style={{ color: GOLD, fontSize: "8px", letterSpacing: "0.3em", fontFamily: "sans-serif" }}>─ PRIVÉ ─</div>
      </div>

      {/* Thin divider */}
      <div style={{ position: "absolute", top: "8%", left: "10%", right: "10%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(200,168,120,0.1), rgba(200,168,120,0.18), rgba(200,168,120,0.1), transparent)" }} />

      {/* Car silhouette panel */}
      <div style={{
        position: "absolute", bottom: "18%", left: "5%", width: "70%", height: "52%",
        background: "linear-gradient(135deg, rgba(30,22,12,0.9) 0%, rgba(20,16,10,0.6) 100%)",
        borderRadius: "4px", border: "1px solid rgba(200,168,120,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg viewBox="0 0 320 140" width="88%" height="auto" opacity={0.35}>
          <defs>
            <linearGradient id="carGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8A878" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#8a7050" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path d="M30 100 L40 68 L70 48 L140 38 L200 40 L250 52 L285 70 L292 100 Z" fill="none" stroke="url(#carGrad)" strokeWidth="1.5" />
          <path d="M80 68 L100 44 L220 42 L250 68" fill="none" stroke="url(#carGrad)" strokeWidth="1.5" />
          <path d="M98 66 L112 48 L165 46 L165 66 Z" fill="rgba(200,168,120,0.1)" stroke="url(#carGrad)" strokeWidth="1" />
          <path d="M168 66 L168 46 L215 47 L240 66 Z" fill="rgba(200,168,120,0.1)" stroke="url(#carGrad)" strokeWidth="1" />
          <circle cx="82" cy="100" r="20" fill="none" stroke="url(#carGrad)" strokeWidth="1.5" />
          <circle cx="82" cy="100" r="10" fill="none" stroke="url(#carGrad)" strokeWidth="1" />
          <circle cx="240" cy="100" r="20" fill="none" stroke="url(#carGrad)" strokeWidth="1.5" />
          <circle cx="240" cy="100" r="10" fill="none" stroke="url(#carGrad)" strokeWidth="1" />
          <path d="M32 80 L42 74 L52 76 L44 82 Z" fill="rgba(200,168,120,0.3)" stroke="url(#carGrad)" strokeWidth="1" />
          <ellipse cx="36" cy="78" rx="18" ry="8" fill="rgba(200,168,120,0.04)" />
          <line x1="30" y1="122" x2="292" y2="122" stroke="rgba(200,168,120,0.2)" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Chauffeur silhouette */}
      <div style={{ position: "absolute", bottom: "18%", right: "5%", width: "12%", height: "52%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <svg viewBox="0 0 60 160" width="100%" height="85%" opacity={0.3}>
          <defs>
            <linearGradient id="personGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8A878" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8a7050" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <circle cx="30" cy="18" r="11" fill="none" stroke="url(#personGrad)" strokeWidth="1.2" />
          <path d="M12 44 L6 80 L10 80 L14 55 L30 58 L46 55 L50 80 L54 80 L48 44 Q30 36 12 44Z" fill="rgba(200,168,120,0.06)" stroke="url(#personGrad)" strokeWidth="1.2" />
          <rect x="14" y="78" width="32" height="50" rx="2" fill="rgba(200,168,120,0.05)" stroke="url(#personGrad)" strokeWidth="1.1" />
          <rect x="14" y="126" width="13" height="34" rx="2" fill="none" stroke="url(#personGrad)" strokeWidth="1.1" />
          <rect x="33" y="126" width="13" height="34" rx="2" fill="none" stroke="url(#personGrad)" strokeWidth="1.1" />
          <path d="M28 44 L30 58 L32 44" fill="rgba(200,168,120,0.15)" stroke="url(#personGrad)" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Blend overlays */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.3) 30%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%", background: "linear-gradient(180deg, rgba(10,10,10,0.6) 0%, transparent 100%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "25%", background: "linear-gradient(0deg, rgba(10,10,10,0.8) 0%, transparent 100%)", pointerEvents: "none" }} />
    </div>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as number[] } },
};

export default function HeroMain() {
  return (
    <section style={{ minHeight: "100vh", background: "#0A0A0A", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", top: "20%", left: "-5%", width: "45%", height: "60%", background: "radial-gradient(ellipse, rgba(200,168,120,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div className="grid lg:grid-cols-[45fr_55fr] flex-col" style={{ flex: 1, minHeight: "100vh" }}>
        {/* LEFT */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "clamp(6rem, 10vw, 9rem) clamp(2rem, 6vw, 5rem) clamp(3rem, 5vw, 4rem)",
          position: "relative", zIndex: 2,
          background: "linear-gradient(90deg, #0A0A0A 80%, transparent 100%)",
        }}>
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants}><HeroBadge /></motion.div>

            <motion.h1 style={{ margin: "0 0 1.5rem", padding: 0, lineHeight: 1.08 }}>
              <motion.span variants={itemVariants} style={{ display: "block", fontFamily: "'Playfair Display', Georgia, serif", color: OFF_WHITE, fontSize: "clamp(48px, 5.5vw, 78px)", fontWeight: 700, letterSpacing: "-0.01em" }}>
                Travel First Class.
              </motion.span>
              <motion.span variants={itemVariants} style={{ display: "block", fontFamily: "'Playfair Display', Georgia, serif", color: WARM_BEIGE, fontSize: "clamp(48px, 5.5vw, 78px)", fontWeight: 700, letterSpacing: "-0.01em", fontStyle: "italic" }}>
                Every Mile.
              </motion.span>
            </motion.h1>

            <motion.p variants={itemVariants} style={{ color: "rgba(246,244,239,0.6)", fontSize: "clamp(14px, 1.5vw, 16px)", fontFamily: "sans-serif", fontWeight: 300, lineHeight: 1.75, maxWidth: "440px", margin: "0 0 2.5rem", letterSpacing: "0.01em" }}>
              Experience luxury, comfort and punctuality<br />
              with Movo. We don&apos;t just drive,<br />
              we deliver an experience.
            </motion.p>

            <motion.div variants={itemVariants} style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
              <PrimaryButton />
              <SecondaryButton />
            </motion.div>
          </motion.div>

          {/* Gold accent line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: "absolute", bottom: "12%", left: "clamp(2rem, 6vw, 5rem)", width: "60px", height: "1px", background: "linear-gradient(90deg, #C8A878, transparent)", transformOrigin: "left" }}
          />
        </div>

        {/* RIGHT */}
        <motion.div
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "relative", minHeight: "60vh" }}
        >
          <VehicleScene />
        </motion.div>
      </div>
    </section>
  );
}
