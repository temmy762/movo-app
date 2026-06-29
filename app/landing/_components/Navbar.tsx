"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Menu, X } from "lucide-react";
import Link from "next/link";

const NAV_LINKS = ["Services", "For Business", "Fleet", "About Us"];

const C = {
  text:  "#F0EAE0",
  muted: "rgba(240,234,224,0.45)",
  gold:  "#B09060",
  rule:  "rgba(240,234,224,0.07)",
  sans:  "var(--font-dm-sans), var(--font-inter), -apple-system, sans-serif",
  serif: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
          height: "68px", display: "flex", alignItems: "center",
          padding: "0 clamp(1.5rem, 5vw, 4rem)",
          background: scrolled ? "rgba(8,8,8,0.96)" : "rgba(8,8,8,0.18)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${scrolled ? "rgba(240,234,224,0.06)" : "rgba(240,234,224,0.04)"}`,
          transition: "background 0.5s, border-color 0.5s",
        }}
      >
        <div style={{ maxWidth: "1440px", margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontFamily: C.serif, color: C.text, fontSize: "22px", fontWeight: 600, letterSpacing: "0.18em" }}>MOVO</span>
            <span style={{ fontFamily: C.sans, color: C.gold, fontSize: "9px", letterSpacing: "0.3em", fontWeight: 500, textTransform: "uppercase" as const }}>Privé</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex" style={{ alignItems: "center", gap: "2.5rem" }}>
            {NAV_LINKS.map((label, i) => (
              <motion.a
                key={label} href="#"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.07 }}
                whileHover={{ color: C.text }}
                style={{ color: C.muted, fontSize: "12px", fontFamily: C.sans, fontWeight: 500, letterSpacing: "0.1em", textDecoration: "none", textTransform: "uppercase" as const, transition: "color 0.2s" }}
              >
                {label}
              </motion.a>
            ))}
          </div>

          {/* Right side */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}
          >
            <div className="hidden md:flex" style={{ alignItems: "center", gap: "6px", color: C.muted, fontSize: "12px", fontFamily: C.sans, letterSpacing: "0.04em" }}>
              <Phone size={12} color={C.gold} strokeWidth={1.5} />
              +1 (800) 123-4567
            </div>

            <Link href="/home/pickup">
              <motion.button
                whileHover={{ backgroundColor: "rgba(240,234,224,0.12)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: "transparent", color: C.text,
                  padding: "9px 20px", border: `1px solid rgba(240,234,224,0.18)`,
                  cursor: "pointer", fontFamily: C.sans, fontSize: "12px",
                  fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const,
                  whiteSpace: "nowrap", transition: "background 0.25s",
                }}
              >
                Book Now
              </motion.button>
            </Link>

            <button
              onClick={() => setMobileOpen(v => !v)}
              className="flex lg:hidden"
              style={{ background: "none", border: "none", cursor: "pointer", color: C.text, padding: "4px" }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </motion.div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            style={{
              position: "fixed", top: "68px", left: 0, right: 0, zIndex: 999,
              background: "rgba(8,8,8,0.98)", backdropFilter: "blur(24px)",
              borderBottom: `1px solid ${C.rule}`,
              padding: "1.75rem clamp(1.5rem, 5vw, 4rem)", display: "flex", flexDirection: "column", gap: "1.5rem",
            }}
          >
            {NAV_LINKS.map((label) => (
              <a key={label} href="#" style={{ color: C.muted, fontSize: "13px", fontFamily: C.sans, textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>{label}</a>
            ))}
            <div style={{ color: C.muted, fontSize: "12px", fontFamily: C.sans, display: "flex", alignItems: "center", gap: "7px", paddingTop: "0.25rem", borderTop: `1px solid ${C.rule}`, paddingBottom: "0.25rem" }}>
              <Phone size={12} color={C.gold} strokeWidth={1.5} /> +1 (800) 123-4567
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
