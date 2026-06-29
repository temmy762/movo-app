"use client";

const WORDS = ["Luxury", "Precision", "Discretion", "Excellence", "Punctuality", "Prestige", "Comfort", "Reliability"];
const GOLD  = "#B09060";
const SANS  = "var(--font-dm-sans), var(--font-inter), -apple-system, sans-serif";

const TRACK = [...WORDS, ...WORDS].map((w, i) => (
  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "1.75rem" }}>
    <span style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, letterSpacing: "0.22em", color: `rgba(240,234,224,0.32)`, textTransform: "uppercase" as const }}>
      {w}
    </span>
    <span style={{ color: GOLD, fontSize: "10px", opacity: 0.5 }}>◆</span>
  </span>
));

export default function MarqueeStrip() {
  return (
    <div style={{
      background: "#080808",
      borderTop:    "1px solid rgba(240,234,224,0.05)",
      borderBottom: "1px solid rgba(240,234,224,0.05)",
      overflow: "hidden", padding: "14px 0",
    }}>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .movo-marquee {
          display: flex; gap: 1.75rem; width: max-content;
          animation: marquee 28s linear infinite;
        }
        .movo-marquee:hover { animation-play-state: paused; }
      `}</style>
      <div className="movo-marquee">{TRACK}</div>
    </div>
  );
}
