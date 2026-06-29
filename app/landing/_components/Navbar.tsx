"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ChevronDown, ArrowRight, Crown, Menu, X } from "lucide-react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Services", hasDropdown: true },
  { label: "For Business" },
  { label: "Fleet" },
  { label: "Chauffeurs" },
  { label: "About Us" },
  { label: "Contact" },
];

const GOLD = "#C8A878";
const OFF_WHITE = "#F6F4EF";

function NavLink({ label, hasDropdown, delay }: { label: string; hasDropdown?: boolean; delay: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.a
      href="#"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: hovered ? OFF_WHITE : "rgba(246,244,239,0.6)",
        fontSize: "13px",
        fontFamily: "var(--font-inter), sans-serif",
        fontWeight: 400,
        letterSpacing: "0.05em",
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        gap: "3px",
        transition: "color 0.25s",
        position: "relative",
        paddingBottom: "3px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {hasDropdown && <ChevronDown size={11} />}
      <span style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "1px",
        background: `linear-gradient(90deg, ${GOLD}, transparent)`,
        transform: hovered ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left",
        transition: "transform 0.3s ease",
      }} />
    </motion.a>
  );
}

function BookButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href="/home/pickup">
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "#E7D8C4" : OFF_WHITE,
          color: "#0A0A0A",
          padding: "10px 22px", borderRadius: "100px",
          border: "none", cursor: "pointer",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "13px", fontWeight: 600, letterSpacing: "0.04em",
          display: "flex", alignItems: "center", gap: "8px",
          transition: "all 0.25s ease",
          transform: hovered ? "translateY(-1px)" : "translateY(0)",
          boxShadow: hovered ? "0 8px 28px rgba(200,168,120,0.22)" : "0 2px 10px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        Book a Ride
        <ArrowRight size={14} style={{ transform: hovered ? "translateX(3px)" : "translateX(0)", transition: "transform 0.25s" }} />
      </button>
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
          height: "72px", display: "flex", alignItems: "center", padding: "0 3rem",
          background: scrolled ? "rgba(10,10,10,0.92)" : "rgba(10,10,10,0.25)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: `1px solid rgba(200,168,120,${scrolled ? 0.15 : 0.06})`,
          transition: "background 0.5s ease, border-color 0.5s ease",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <Crown size={20} color={GOLD} strokeWidth={1.5} />
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", color: OFF_WHITE, fontSize: "18px", fontWeight: 700, letterSpacing: "0.12em", lineHeight: 1.1 }}>MOVO</div>
              <div style={{ color: GOLD, fontSize: "8.5px", letterSpacing: "0.28em", fontFamily: "sans-serif", textAlign: "center", lineHeight: 1 }}>─ PRIVÉ ─</div>
            </div>
          </motion.div>

          {/* Desktop links */}
          <div className="hidden lg:flex" style={{ alignItems: "center", gap: "2rem" }}>
            {NAV_LINKS.map(({ label, hasDropdown }, i) => (
              <NavLink key={label} label={label} hasDropdown={hasDropdown} delay={0.1 + i * 0.06} />
            ))}
          </div>

          {/* Right */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.55 }}
            style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div className="hidden md:flex" style={{ alignItems: "center", gap: "7px", color: "rgba(246,244,239,0.6)", fontSize: "13px", fontFamily: "sans-serif", whiteSpace: "nowrap" }}>
              <Phone size={13} color={GOLD} />
              +1 (800) 123-4567
            </div>
            <BookButton />
            <button onClick={() => setMobileOpen(v => !v)} className="flex lg:hidden"
              style={{ background: "none", border: "none", cursor: "pointer", color: OFF_WHITE, padding: "4px" }}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </motion.div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed", top: "72px", left: 0, right: 0, zIndex: 999,
              background: "rgba(10,10,10,0.97)", backdropFilter: "blur(24px)",
              borderBottom: "1px solid rgba(200,168,120,0.12)",
              padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem",
            }}
          >
            {NAV_LINKS.map(({ label }) => (
              <a key={label} href="#" style={{ color: "rgba(246,244,239,0.75)", fontSize: "15px", fontFamily: "sans-serif", textDecoration: "none", letterSpacing: "0.04em" }}>{label}</a>
            ))}
            <div style={{ color: "rgba(246,244,239,0.5)", fontSize: "13px", fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: "7px", paddingTop: "0.5rem" }}>
              <Phone size={13} color={GOLD} /> +1 (800) 123-4567
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
