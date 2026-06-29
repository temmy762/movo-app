"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  bg:        "#080808",
  surface:   "#0E0E0E",
  text:      "#F0EAE0",
  muted:     "rgba(240,234,224,0.42)",
  dim:       "rgba(240,234,224,0.15)",
  gold:      "#B09060",
  goldFaint: "rgba(176,144,96,0.08)",
  rule:      "rgba(240,234,224,0.07)",
  serif:     "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
  sans:      "var(--font-dm-sans), var(--font-inter), -apple-system, sans-serif",
};

/* ── Animated stat counter ───────────────────────────────── */
function StatCounter({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 });
  const count = useMotionValue(0);
  const rounded = useTransform(count, v =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()
  );

  useEffect(() => {
    if (inView) animate(count, target, { duration: 2, ease: "easeOut" });
  }, [inView, count, target]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>
      <motion.span>{rounded}</motion.span>{suffix}
    </span>
  );
}

/* ── Line-reveal animation wrapper ─────────────────────── */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div style={{ overflow: "hidden" }}>
      <motion.div
        initial={{ y: "105%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ── Vehicle SVG scene ──────────────────────────────────── */
function VehicleScene() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <svg
        viewBox="0 0 900 700"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <radialGradient id="atmos" cx="50%" cy="62%" r="52%">
            <stop offset="0%"   stopColor="#2e1f08" stopOpacity="1" />
            <stop offset="55%"  stopColor="#160f03" stopOpacity="1" />
            <stop offset="100%" stopColor="#080808" stopOpacity="1" />
          </radialGradient>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#B09060" stopOpacity="0.55" />
            <stop offset="45%"  stopColor="#1a1308" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#080808" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="winGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#B09060" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#B09060" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="groundRefl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#B09060" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#080808" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beamL" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#B09060" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#B09060" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beamR" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#B09060" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#B09060" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <clipPath id="sceneClip">
            <rect x="0" y="0" width="900" height="700" />
          </clipPath>
        </defs>

        <g clipPath="url(#sceneClip)">
          {/* Background atmosphere */}
          <rect width="900" height="700" fill="url(#atmos)" />

          {/* Atmospheric halo behind car */}
          <ellipse cx="450" cy="460" rx="340" ry="200" fill="#2a1a06" opacity="0.35" filter="url(#softGlow)" />

          {/* Light beams from top corners */}
          <polygon points="0,0 220,0 480,470" fill="url(#beamL)" opacity="0.5" />
          <polygon points="900,0 680,0 420,470" fill="url(#beamR)" opacity="0.4" />

          {/* Architectural grid lines — very faint */}
          <line x1="0" y1="240" x2="900" y2="240" stroke="#B09060" strokeWidth="0.4" opacity="0.05" />
          <line x1="0" y1="380" x2="900" y2="380" stroke="#B09060" strokeWidth="0.4" opacity="0.04" />
          <line x1="140" y1="0" x2="140" y2="700" stroke="#B09060" strokeWidth="0.4" opacity="0.045" />
          <line x1="760" y1="0" x2="760" y2="700" stroke="#B09060" strokeWidth="0.4" opacity="0.04" />

          {/* Ground plane line */}
          <line x1="60" y1="508" x2="840" y2="508" stroke="#B09060" strokeWidth="0.6" opacity="0.28" />

          {/* Ground reflection glow */}
          <rect x="120" y="508" width="660" height="120" fill="url(#groundRefl)" />

          {/* ── Car body — S-Class sedan profile ── */}
          {/* Outer body */}
          <path
            d="M 120 508 L 132 456 L 162 388 L 198 340 L 255 298 L 330 278 L 530 274 L 610 285 L 672 318 L 720 368 L 740 430 L 752 508 Z"
            fill="#0D0A06" stroke="#B09060" strokeWidth="1.4" strokeOpacity="0.55"
          />

          {/* Roofline */}
          <path
            d="M 220 385 L 248 300 L 310 280 L 525 276 L 600 290 L 648 330 L 670 385"
            fill="none" stroke="#B09060" strokeWidth="1.1" strokeOpacity="0.38"
          />

          {/* Front windshield */}
          <path d="M 222 383 L 252 302 L 318 283 L 318 383 Z" fill="url(#winGrad)" opacity="0.75" />

          {/* Front door window */}
          <path d="M 324 380 L 324 281 L 432 278 L 432 380 Z" fill="url(#winGrad)" opacity="0.65" />

          {/* Rear door window */}
          <path d="M 438 379 L 438 277 L 528 275 L 528 379 Z" fill="url(#winGrad)" opacity="0.6" />

          {/* Rear windshield */}
          <path d="M 534 378 L 534 277 L 602 290 L 648 330 L 648 378 Z" fill="url(#winGrad)" opacity="0.55" />

          {/* Door seam lines */}
          <line x1="322" y1="286" x2="322" y2="490" stroke="#B09060" strokeWidth="0.5" opacity="0.2" />
          <line x1="436" y1="280" x2="436" y2="488" stroke="#B09060" strokeWidth="0.5" opacity="0.2" />
          <line x1="532" y1="277" x2="532" y2="486" stroke="#B09060" strokeWidth="0.5" opacity="0.2" />

          {/* Character line (body crease) */}
          <path
            d="M 140 430 Q 300 418 450 414 Q 600 418 740 432"
            fill="none" stroke="#B09060" strokeWidth="0.8" opacity="0.22"
          />

          {/* Front wheel arch */}
          <path d="M 162 508 Q 236 400 306 508" fill="none" stroke="#B09060" strokeWidth="1.3" opacity="0.5" />

          {/* Front wheel */}
          <circle cx="236" cy="508" r="62" fill="#060504" stroke="#B09060" strokeWidth="1.3" strokeOpacity="0.62" />
          <circle cx="236" cy="508" r="44" fill="none" stroke="#B09060" strokeWidth="0.8" strokeOpacity="0.35" />
          <circle cx="236" cy="508" r="22" fill="none" stroke="#B09060" strokeWidth="1.2" strokeOpacity="0.45" />
          {/* 5-spoke rim */}
          {[0,72,144,216,288].map(angle => {
            const r = Math.PI * angle / 180;
            const x1 = 236 + 22 * Math.cos(r); const y1 = 508 + 22 * Math.sin(r);
            const x2 = 236 + 44 * Math.cos(r); const y2 = 508 + 44 * Math.sin(r);
            return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#B09060" strokeWidth="1" opacity="0.3" />;
          })}

          {/* Rear wheel arch */}
          <path d="M 610 508 Q 682 400 754 508" fill="none" stroke="#B09060" strokeWidth="1.3" opacity="0.5" />

          {/* Rear wheel */}
          <circle cx="682" cy="508" r="62" fill="#060504" stroke="#B09060" strokeWidth="1.3" strokeOpacity="0.62" />
          <circle cx="682" cy="508" r="44" fill="none" stroke="#B09060" strokeWidth="0.8" strokeOpacity="0.35" />
          <circle cx="682" cy="508" r="22" fill="none" stroke="#B09060" strokeWidth="1.2" strokeOpacity="0.45" />
          {[0,72,144,216,288].map(angle => {
            const r = Math.PI * angle / 180;
            const x1 = 682 + 22 * Math.cos(r); const y1 = 508 + 22 * Math.sin(r);
            const x2 = 682 + 44 * Math.cos(r); const y2 = 508 + 44 * Math.sin(r);
            return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#B09060" strokeWidth="1" opacity="0.3" />;
          })}

          {/* Front headlight cluster */}
          <path d="M 124 430 L 148 400 L 178 405 L 165 440 Z" fill="#B09060" opacity="0.08" />
          <ellipse cx="146" cy="418" rx="14" ry="10" fill="#B09060" opacity="0.5" filter="url(#glow)" />
          <ellipse cx="164" cy="415" rx="8"  ry="6"  fill="#F5E0B0" opacity="0.65" filter="url(#glow)" />
          {/* Headlight beam */}
          <path d="M 120 420 L 60 405 L 50 430 L 118 438 Z" fill="#B09060" opacity="0.04" />

          {/* Tail light */}
          <rect x="748" y="390" width="6" height="42" rx="2" fill="#B09060" opacity="0.6" filter="url(#glow)" />
          <rect x="750" y="395" width="2" height="30" rx="1" fill="#FFE0A0" opacity="0.55" filter="url(#glow)" />

          {/* Front grille hint */}
          <path d="M 126 452 L 142 432 L 162 438 L 148 460 Z" fill="none" stroke="#B09060" strokeWidth="0.7" opacity="0.28" />

          {/* Car top shadow / depth */}
          <ellipse cx="436" cy="285" rx="220" ry="18" fill="#080808" opacity="0.4" filter="url(#softGlow)" />

          {/* Under-car shadow */}
          <ellipse cx="436" cy="530" rx="300" ry="28" fill="#000" opacity="0.55" filter="url(#softGlow)" />

          {/* Ground reflection of car (inverted, faded) */}
          <path
            d="M 120 508 L 132 556 L 180 590 L 320 608 L 560 606 L 700 592 L 752 555 L 752 508 Z"
            fill="#0D0A06" opacity="0.18"
          />

          {/* Top edge vignette */}
          <rect x="0" y="0" width="900" height="120" fill="url(#atmos)" opacity="0.5" />
          {/* Bottom vignette */}
          <rect x="0" y="580" width="900" height="120" fill="#080808" opacity="0.9" />
        </g>
      </svg>

      {/* Left-side content blend */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #080808 0%, rgba(8,8,8,0.55) 35%, transparent 65%)", pointerEvents: "none" }} />
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────── */
function Stat({ value, suffix, label, decimals, delay }: {
  value: number; suffix?: string; label: string; decimals?: number; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "flex", flexDirection: "column", gap: "3px" }}
    >
      <div style={{ fontFamily: C.serif, fontSize: "clamp(28px,2.8vw,42px)", fontWeight: 600, color: C.text, lineHeight: 1, letterSpacing: "-0.01em" }}>
        <StatCounter target={value} suffix={suffix} decimals={decimals} />
      </div>
      <div style={{ fontFamily: C.sans, fontSize: "10px", letterSpacing: "0.18em", color: C.muted, textTransform: "uppercase" as const, fontWeight: 500 }}>{label}</div>
    </motion.div>
  );
}

/* ── Main hero export ───────────────────────────────────── */
export default function HeroMain() {
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <section style={{ position: "relative", minHeight: "100svh", background: C.bg, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* ── Vehicle scene (full-section background on right) ── */}
      <div className="hidden lg:block" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "52%", zIndex: 0 }}>
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", inset: 0 }}
        >
          <VehicleScene />
        </motion.div>
      </div>

      {/* ── Noise texture overlay ── */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: 0.032,
      }} />

      {/* ── Left content panel ── */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", flex: 1, justifyContent: "center",
        padding: "clamp(7rem, 11vw, 10rem) clamp(2rem, 7vw, 6rem) clamp(4rem, 6vw, 5rem)",
        maxWidth: "clamp(520px, 52vw, 760px)",
        background: "linear-gradient(90deg, #080808 55%, rgba(8,8,8,0.6) 78%, transparent 100%)",
      }}>

        {/* Eyebrow label */}
        <Reveal delay={0.25}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "2.4rem" }}>
            <div style={{ width: "28px", height: "1px", background: C.gold, opacity: 0.7 }} />
            <span style={{ fontFamily: C.sans, fontSize: "10.5px", letterSpacing: "0.22em", color: C.gold, fontWeight: 600, textTransform: "uppercase" as const }}>
              Movo Privé — Est. 2024
            </span>
          </div>
        </Reveal>

        {/* Headline */}
        <div style={{ marginBottom: "2rem" }}>
          <Reveal delay={0.38}>
            <h1 style={{ margin: 0, padding: 0, fontFamily: C.serif, fontSize: "clamp(56px, 6.2vw, 92px)", fontWeight: 400, lineHeight: 1.0, color: C.text, letterSpacing: "-0.015em" }}>
              First Class.
            </h1>
          </Reveal>
          <Reveal delay={0.5}>
            <h1 style={{ margin: 0, padding: 0, fontFamily: C.serif, fontSize: "clamp(56px, 6.2vw, 92px)", fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.015em", fontStyle: "italic", color: C.gold }}>
              Every Time.
            </h1>
          </Reveal>
        </div>

        {/* Thin rule */}
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: "56px", height: "1px", background: C.rule, transformOrigin: "left", marginBottom: "2rem" }}
        />

        {/* Body copy */}
        <Reveal delay={0.65}>
          <p style={{ fontFamily: C.sans, fontSize: "clamp(13px, 1.4vw, 15px)", fontWeight: 300, color: C.muted, lineHeight: 1.85, maxWidth: "380px", margin: "0 0 2.75rem", letterSpacing: "0.01em" }}>
            We don&apos;t just drive — we deliver an experience.<br />
            Punctual, discreet, impeccably presented.<br />
            The standard you deserve.
          </p>
        </Reveal>

        {/* CTAs */}
        <Reveal delay={0.78}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <Link href="/home/pickup">
              <motion.button
                onHoverStart={() => setBtnHovered(true)}
                onHoverEnd={() => setBtnHovered(false)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: C.text, color: C.bg,
                  padding: "14px 28px", border: "none", cursor: "pointer",
                  fontFamily: C.sans, fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  display: "flex", alignItems: "center", gap: "10px",
                  boxShadow: btnHovered ? "0 14px 40px rgba(176,144,96,0.2)" : "none",
                  transition: "box-shadow 0.3s",
                }}
              >
                Book a Ride
                <ArrowRight size={14} />
              </motion.button>
            </Link>

            <motion.a
              href="#fleet"
              whileHover={{ x: 4 }}
              style={{
                fontFamily: C.sans, fontSize: "13px", color: C.muted,
                letterSpacing: "0.08em", textTransform: "uppercase" as const,
                textDecoration: "none", fontWeight: 500,
                display: "flex", alignItems: "center", gap: "8px",
                borderBottom: `1px solid ${C.dim}`, paddingBottom: "2px",
                transition: "color 0.25s, border-color 0.25s",
              }}
            >
              View Fleet
            </motion.a>
          </div>
        </Reveal>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          style={{ display: "flex", gap: "clamp(1.5rem, 3vw, 3rem)", marginTop: "clamp(3rem, 5vw, 4.5rem)", flexWrap: "wrap" }}
        >
          <Stat value={98}   suffix="%" label="On-Time"    delay={1.15} />
          <div style={{ width: "1px", background: C.rule, alignSelf: "stretch" }} />
          <Stat value={4.9}  suffix="★" label="Rating"     delay={1.25} decimals={1} />
          <div style={{ width: "1px", background: C.rule, alignSelf: "stretch" }} />
          <Stat value={500}  suffix="+" label="Vehicles"   delay={1.35} />
          <div style={{ width: "1px", background: C.rule, alignSelf: "stretch" }} />
          <Stat value={24}   suffix="/7" label="Support"   delay={1.45} />
        </motion.div>
      </div>
    </section>
  );
}
