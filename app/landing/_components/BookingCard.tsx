"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const C = {
  bg:     "#0C0C0C",
  text:   "#F0EAE0",
  muted:  "rgba(240,234,224,0.38)",
  gold:   "#B09060",
  rule:   "rgba(240,234,224,0.07)",
  sans:   "var(--font-dm-sans), var(--font-inter), -apple-system, sans-serif",
};

const LOCATIONS  = ["Manhattan, New York", "JFK International Airport", "LaGuardia Airport", "Newark Liberty Airport", "The Plaza Hotel", "Grand Central Terminal"];
const DATES      = ["Today", "Tomorrow", "Mon, Jul 7", "Tue, Jul 8", "Wed, Jul 9", "Fri, Jul 11"];
const TIMES      = ["08:00 AM", "09:00 AM", "10:00 AM", "12:00 PM", "02:00 PM", "06:00 PM", "09:00 PM"];
const PASSENGERS = ["1 Passenger", "2 Passengers", "3 Passengers", "4 Passengers", "5–6 Passengers"];

type FieldProps = { icon: React.ElementType; label: string; placeholder: string; options: string[]; };

function Field({ icon: Icon, label, placeholder, options }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div style={{ flex: "1 1 0", minWidth: "130px", position: "relative", padding: "0 1.5rem", borderRight: `1px solid ${C.rule}` }}>
      <label style={{ display: "block", fontSize: "9px", fontFamily: C.sans, fontWeight: 600, letterSpacing: "0.18em", color: C.muted, marginBottom: "6px", textTransform: "uppercase" as const }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Icon size={13} color={focused ? C.gold : C.muted} strokeWidth={1.5} style={{ flexShrink: 0, transition: "color 0.2s" }} />
        <select
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{ background: "none", border: "none", outline: "none", width: "100%", fontFamily: C.sans, fontSize: "13px", fontWeight: 400, color: value ? C.text : C.muted, cursor: "pointer", appearance: "none" as const }}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(o => <option key={o} value={o} style={{ background: "#141414", color: C.text }}>{o}</option>)}
        </select>
      </div>
      {/* Focus underline */}
      <div style={{ position: "absolute", bottom: 0, left: "1.5rem", right: "1.5rem", height: "1px", background: C.gold, transform: focused ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left", transition: "transform 0.25s ease" }} />
    </div>
  );
}

export default function BookingCard() {
  const router = useRouter();

  return (
    <section style={{ background: C.bg, borderTop: `1px solid ${C.rule}`, borderBottom: `1px solid ${C.rule}` }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", alignItems: "stretch", flexWrap: "wrap", minHeight: "80px" }}
      >
        {/* Label */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 1.5rem 0 clamp(1.5rem, 5vw, 4rem)", borderRight: `1px solid ${C.rule}`, flexShrink: 0 }}>
          <span style={{ fontFamily: C.sans, fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: C.gold, textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>Book a Ride</span>
        </div>

        <Field icon={MapPin}   label="Pick-up"    placeholder="Pick-up location"  options={LOCATIONS} />
        <Field icon={MapPin}   label="Drop-off"   placeholder="Destination"       options={LOCATIONS} />
        <Field icon={Calendar} label="Date"       placeholder="Date"              options={DATES} />
        <Field icon={Clock}    label="Time"       placeholder="Time"              options={TIMES} />
        <Field icon={Users}    label="Passengers" placeholder="Passengers"        options={PASSENGERS} />

        {/* CTA */}
        <motion.button
          whileHover={{ background: C.gold }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/home/pickup")}
          style={{
            flexShrink: 0, background: C.text, color: "#080808",
            padding: "0 clamp(1.5rem, 3vw, 2.5rem)",
            border: "none", cursor: "pointer", fontFamily: C.sans,
            fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            display: "flex", alignItems: "center", gap: "10px",
            transition: "background 0.25s",
          }}
        >
          Search
          <ArrowRight size={13} />
        </motion.button>
      </motion.div>
    </section>
  );
}
