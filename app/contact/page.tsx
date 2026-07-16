"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const DARK = "#0A0A0F";
const NAVY = "#131936";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to send");
      setSent(true);
      setName(""); setEmail(""); setPhone(""); setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
      <nav className="sticky top-0 z-40 border-b border-white/10" style={{ background: DARK }}>
        <div className="max-w-4xl mx-auto px-5 md:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Image src="/images/logo/logo-horizontal-ivory.svg" alt="Movo" width={100} height={28} unoptimized />
          </Link>
          <Link href="/" className="text-white/60 text-[13px] font-medium hover:text-white transition-colors">Back to home</Link>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-5 md:px-8 py-10 md:py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: "#C6BFB2" }}>Get in touch</p>
        <h1 className="text-[28px] md:text-[34px] font-extrabold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-[14px] text-gray-500 mb-10">We're here to help with bookings, chauffeur applications, or anything else.</p>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Contact details */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-gray-100 p-5">
              <p className="text-[13px] font-bold text-gray-900 mb-1">Customer Support</p>
              <a href="mailto:support@movoprive.com" className="text-[13px] text-gray-600 hover:text-gray-900">support@movoprive.com</a>
            </div>
            <div className="rounded-2xl border border-gray-100 p-5">
              <p className="text-[13px] font-bold text-gray-900 mb-1">Bookings</p>
              <a href="mailto:bookings@movoprive.com" className="text-[13px] text-gray-600 hover:text-gray-900">bookings@movoprive.com</a>
            </div>
            <div className="rounded-2xl border border-gray-100 p-5">
              <p className="text-[13px] font-bold text-gray-900 mb-1">Business Address</p>
              <p className="text-[13px] text-gray-600">Toronto, Ontario, Canada</p>
              <p className="text-[11px] text-gray-400 mt-1">Full mailing address to be confirmed by the business.</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-5">
              <p className="text-[13px] font-bold text-gray-900 mb-1">Business Hours</p>
              <p className="text-[13px] text-gray-600">Monday – Sunday, 24/7 support for active rides</p>
              <p className="text-[13px] text-gray-600">General inquiries answered within 1 business day</p>
            </div>
          </div>

          {/* Contact form */}
          <div>
            {sent ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
                <p className="text-[15px] font-bold text-green-700 mb-1">Message sent</p>
                <p className="text-[13px] text-green-600">Thanks for reaching out — we'll get back to you shortly.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[13px] focus:outline-none focus:border-[#131936]" />
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email address"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[13px] focus:outline-none focus:border-[#131936]" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number (optional)"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[13px] focus:outline-none focus:border-[#131936]" />
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="How can we help?" rows={5}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[13px] focus:outline-none focus:border-[#131936] resize-none" />
                {error && <p className="text-[12px] text-red-500">{error}</p>}
                <button type="button" onClick={submit} disabled={sending || !name.trim() || !email.trim() || !message.trim()}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg,${DARK},${NAVY},#2A3055)` }}>
                  {sending ? "Sending…" : "Send Message"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-100 py-6" style={{ background: "#FAFAF8" }}>
        <div className="max-w-4xl mx-auto px-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400">&copy; {new Date().getFullYear()} Movo. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center">
            <Link href="/privacy-policy" className="text-[11px] text-gray-400 hover:text-gray-700">Privacy Policy</Link>
            <Link href="/terms" className="text-[11px] text-gray-400 hover:text-gray-700">Terms &amp; Conditions</Link>
            <Link href="/data-security" className="text-[11px] text-gray-400 hover:text-gray-700">Data Security</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
