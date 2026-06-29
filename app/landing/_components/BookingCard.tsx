"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const GOLD = "#C8A878";
const OFF_WHITE = "#F6F4EF";

const LOCATIONS = ["Manhattan, New York", "JFK International Airport", "LaGuardia Airport", "Newark Liberty Airport", "The Plaza Hotel", "Grand Central Terminal"];
const DATES = ["Today", "Tomorrow", "Mon, Jul 7", "Tue, Jul 8", "Wed, Jul 9", "Fri, Jul 11"];
const TIMES = ["08:00 AM", "09:00 AM", "10:00 AM", "12:00 PM", "02:00 PM", "06:00 PM", "09:00 PM"];
const PASSENGERS = ["1 Passenger", "2 Passengers", "3 Passengers", "4 Passengers", "5–6 Passengers"];

type FieldProps = {
  icon: React.ElementType;
  label: string;
  placeholder: string;
  options: string[];
  isLast?: boolean;
};

function SelectField({ icon: Icon, label, placeholder, options, isLast }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div style={{
      flex: "1 1 140px", minWidth: "120px",
      borderRight: isLast ? "none" : "1px solid rgba(0,0,0,0.07)",
      padding: "1rem 1.25rem", position: "relative",
    }}>
      <label style={{ display: "block", fontSize: "9.5px", fontFamily: "sans-serif", fontWeight: 600, letterSpacing: "0.14em", color: "rgba(10,10,10,0.45)", marginBottom: "5px", textTransform: "uppercase" as const }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <Icon size={14} color={focused ? GOLD : "rgba(10,10,10,0.4)"} style={{ flexShrink: 0, transition: "color 0.2s" }} />
        <select
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{ background: "none", border: "none", outline: "none", width: "100%", fontFamily: "sans-serif", fontSize: "13px", fontWeight: 400, color: value ? "#0A0A0A" : "rgba(10,10,10,0.45)", cursor: "pointer", appearance: "none" as const }}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div style={{
        position: "absolute", bottom: 0, left: "1.25rem", right: "1.25rem",
        height: "1.5px", background: GOLD,
        transform: focused ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left", transition: "transform 0.25s ease",
      }} />
    </div>
  );
}

function FindButton() {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push("/home/pickup")}
      style={{
        flexShrink: 0,
        background: hovered ? "linear-gradient(135deg, #1c1c1c, #0A0A0A)" : "linear-gradient(135deg, #151515, #0A0A0A)",
        color: OFF_WHITE, padding: "0 2rem", height: "52px", borderRadius: "100px",
        border: "none", cursor: "pointer", fontFamily: "sans-serif",
        fontSize: "14px", fontWeight: 600, letterSpacing: "0.04em",
        display: "flex", alignItems: "center", gap: "10px",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-2px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: hovered ? "0 12px 32px rgba(0,0,0,0.35)" : "0 4px 16px rgba(0,0,0,0.2)",
        whiteSpace: "nowrap", margin: "0.75rem",
      }}
    >
      Find a Ride
      <ArrowRight size={14} style={{ transform: hovered ? "translateX(3px)" : "translateX(0)", transition: "transform 0.3s" }} />
    </button>
  );
}

export default function BookingCard() {
  return (
    <div style={{ position: "relative", zIndex: 20, padding: "0 clamp(1.5rem, 5vw, 5rem)", marginTop: "-36px" }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: "1300px", margin: "0 auto", background: OFF_WHITE, borderRadius: "24px", boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "stretch", flexWrap: "wrap" }}>
          <SelectField icon={MapPin}   label="Pick-Up Location"  placeholder="Select location" options={LOCATIONS} />
          <SelectField icon={MapPin}   label="Drop-Off Location" placeholder="Select location" options={LOCATIONS} />
          <SelectField icon={Calendar} label="Date"              placeholder="Select date"     options={DATES} />
          <SelectField icon={Clock}    label="Time"              placeholder="Select time"     options={TIMES} />
          <SelectField icon={Users}    label="Passengers"        placeholder="1 Passenger"    options={PASSENGERS} isLast />
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <FindButton />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
