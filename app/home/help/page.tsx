"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";

type Section = { heading: string; body: string };
type Topic = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  sections: Section[];
};

const helpTopics: Topic[] = [
  {
    id: "booking",
    title: "Booking a Ride",
    description: "How to book, choose a service, and schedule ahead",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    sections: [
      { heading: "Book in a few taps", body: "From the home screen, tap “Where to?”, then set your pickup and destination. Your pickup defaults to your current location, and address suggestions appear as you type. Choose your service level, review the fare estimate, and pay to confirm." },
      { heading: "Choose your service", body: "Standard — comfortable everyday rides. Executive — more space and presence. Concierge — top-tier luxury. Safe Ride — two chauffeurs drive you home in your own vehicle. Each tier shows an estimated total before you book." },
      { heading: "Schedule for later", body: "Pick a future date and time when booking. Scheduled rides are lined up with a chauffeur ahead of your pickup, and you’ll be notified when your chauffeur sets off. You can view and manage upcoming rides from the Rides tab." },
      { heading: "Add a stop during your trip", body: "On the tracking screen, open Actions → Add Stop and enter the address. The additional stop fee (plus tax) is calculated automatically and charged to your card on file — you’ll see the updated total." },
    ],
  },
  {
    id: "payment",
    title: "Payment & Pricing",
    description: "Fares, cards, saved payment methods, and receipts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    sections: [
      { heading: "How fares are calculated", body: "Your fare is based on a base fare plus distance and time, with a service fee and GST added. Extra charges (additional stops, airport pickup) are shown separately. You always see a clear breakdown and total before you pay." },
      { heading: "Payment methods", body: "Movo accepts credit and debit cards, processed securely by Stripe. Movo never stores your full card number. You can save a card during checkout for faster future bookings and in-ride charges, and remove it anytime in Payment settings." },
      { heading: "Fare estimates", body: "As soon as you enter your pickup and destination, we show the distance, estimated duration, and an estimated total per service tier. If you change your destination, tier, or add stops, the estimate recalculates automatically." },
      { heading: "Receipts", body: "When your trip completes, an itemised receipt (fare, any stops, airport fee, service fee, GST, and total) is emailed to you, and the full breakdown is shown on your ride summary screen." },
    ],
  },
  {
    id: "safety",
    title: "Safety Features",
    description: "Live tracking, emergency help, and reporting issues",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    sections: [
      { heading: "Vetted chauffeurs", body: "Every Movo chauffeur is background-checked, licensed, and insured before they’re activated on the platform. You’ll see your chauffeur’s name and vehicle details once they accept your ride." },
      { heading: "Live tracking", body: "Follow your chauffeur on the map in real time, from dispatch to arrival and throughout your trip. The vehicle marker shows their live position and direction of travel." },
      { heading: "Emergency assistance", body: "During an active trip, open the Actions tab and use the Emergency option to reach emergency services or Movo support quickly. Your trip details are available to our team if you need help." },
      { heading: "Report an issue", body: "After any completed ride you can Report an Issue — chauffeur or vehicle concerns, billing, safety, lost property, or general feedback — and attach photos if needed. Our team reviews every report." },
    ],
  },
  {
    id: "cancellation",
    title: "Cancellations & Refunds",
    description: "Cancellation windows, fees, and how refunds work",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    sections: [
      { heading: "Free cancellation", body: "You can cancel free of charge within 5 minutes of booking, or any time before a chauffeur has been assigned — you’ll receive a full refund. While we’re still finding you a chauffeur, cancelling is always free." },
      { heading: "Cancelling after a chauffeur is assigned", body: "If you cancel more than 5 minutes after booking once a chauffeur has accepted, a partial charge may apply to compensate them for their time and travel." },
      { heading: "If a chauffeur cancels or none is found", body: "You’re never charged when a chauffeur cancels after accepting, or if we can’t find one for you — Movo automatically finds another chauffeur or issues a full refund, and lets you know." },
      { heading: "Refund timing", body: "Refunds are returned to your original payment method. Depending on your bank, they typically appear on your statement within 5–10 business days." },
    ],
  },
  {
    id: "account",
    title: "Account & Privacy",
    description: "Profile, ride history, receipts, and account deletion",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    sections: [
      { heading: "Manage your profile", body: "Update your name, phone number, and personal details from Profile → Personal Info. Keeping your contact details current helps your chauffeur reach you." },
      { heading: "Saved payment methods", body: "Add or remove saved cards in Payment settings. Saved cards make future bookings faster and are stored securely by our payment processor, not on Movo’s servers." },
      { heading: "Ride history & receipts", body: "View all your past and upcoming rides in the Rides tab. Open any completed ride to see its fare breakdown and receipt." },
      { heading: "Account deletion", body: "You can request deletion of your account and personal information at any time from Settings, or by emailing support@movoprive.com. Some records may be retained where required by law." },
    ],
  },
  {
    id: "safe-ride",
    title: "Safe Ride",
    description: "Our two-chauffeur service that drives you home in your own car",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    sections: [
      { heading: "What is Safe Ride?", body: "Safe Ride sends two professional chauffeurs. A primary chauffeur drives you home in your own vehicle, while a support chauffeur follows in a Movo car to bring the team back. You keep your car and arrive safely." },
      { heading: "When to use it", body: "Perfect for late nights, events, or any time you’d rather not drive but don’t want to leave your car behind." },
      { heading: "Booking & pricing", body: "Choose Safe Ride when booking. Safe Ride has its own pricing, shown as an estimate before you confirm. Your chauffeur’s status and live location are shown on your tracking screen." },
    ],
  },
];

const faqs = [
  { question: "How do I book a ride?", answer: "Tap “Where to?” on the home screen, set your pickup and destination, choose your service tier, review the fare estimate, and pay to confirm." },
  { question: "What payment methods are accepted?", answer: "Movo accepts credit and debit cards, processed securely by Stripe. You can save a card for faster checkout and remove it anytime in Payment settings." },
  { question: "When am I charged, and can I get a receipt?", answer: "You pay when you book. When the trip completes, an itemised receipt is emailed to you and shown on your ride summary." },
  { question: "How do I cancel a ride, and will I be refunded?", answer: "Cancelling within 5 minutes or before a chauffeur is assigned is free with a full refund. After that a partial charge may apply. If a chauffeur cancels or none is found, you’re fully refunded automatically." },
  { question: "How can I contact my chauffeur?", answer: "Once your ride is confirmed you can call or message your chauffeur directly from the ride tracking screen." },
  { question: "What is Safe Ride?", answer: "Safe Ride sends two chauffeurs — one drives you home in your own vehicle while a support chauffeur follows to bring the team back. You keep your car and arrive safely." },
];

export default function HelpPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openTopic, setOpenTopic] = useState<Topic | null>(null);

  const q = query.trim().toLowerCase();
  const filteredTopics = useMemo(
    () => (!q ? helpTopics : helpTopics.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.sections.some(s => s.heading.toLowerCase().includes(q) || s.body.toLowerCase().includes(q))
    )),
    [q]
  );
  const filteredFaqs = useMemo(
    () => (!q ? faqs : faqs.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))),
    [q]
  );

  /* ── Topic detail view ── */
  if (openTopic) {
    return (
      <div className="h-screen overflow-y-auto bg-gray-50" style={{ fontFamily: "var(--font-body)" }}>
        <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
          <button onClick={() => setOpenTopic(null)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-white text-lg font-semibold">{openTopic.title}</h1>
        </div>
        <div className="px-4 py-5 pb-28 space-y-4">
          {openTopic.sections.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="text-[15px] font-bold text-gray-900 mb-1.5">{s.heading}</h2>
              <p className="text-[13px] text-gray-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
          <div className="bg-gradient-to-r from-[#131936] to-[#C6BFB2] rounded-2xl p-4 text-white">
            <h3 className="font-semibold mb-1 text-[14px]">Still need help?</h3>
            <p className="text-[13px] text-white/80 mb-3">Our support team is available 24/7</p>
            <button onClick={() => router.push("/home/report-incident")}
              className="w-full py-3 bg-white text-[#131936] rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ── Help home ── */
  return (
    <div className="h-screen overflow-y-auto bg-gray-50" style={{ fontFamily: "var(--font-body)" }}>
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}>
        <button onClick={() => router.push("/home")} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h1 className="text-white text-lg font-semibold">Help Center</h1>
      </div>

      <div className="px-4 py-4 bg-white border-b">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for help..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#131936]"
          />
        </div>
      </div>

      {/* Help Topics */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Help Topics</h2>
        {filteredTopics.length === 0 ? (
          <p className="text-[13px] text-gray-400 py-4">No topics match “{query}”.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setOpenTopic(topic)}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#131936] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[#131936] shrink-0">{topic.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{topic.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{topic.description}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAQs */}
      {filteredFaqs.length > 0 && (
        <div className="px-4 pb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {filteredFaqs.map((faq, index) => (
              <details key={index} className="bg-white rounded-xl border border-gray-100 overflow-hidden group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <span className="text-sm font-medium text-gray-900 pr-4">{faq.question}</span>
                  <svg className="shrink-0 transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Contact Support */}
      <div className="px-4 pb-28">
        <div className="bg-gradient-to-r from-[#131936] to-[#C6BFB2] rounded-2xl p-4 text-white">
          <h3 className="font-semibold mb-1">Still need help?</h3>
          <p className="text-sm text-white/80 mb-3">Our support team is available 24/7</p>
          <button onClick={() => router.push("/home/report-incident")}
            className="w-full py-3 bg-white text-[#131936] rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors">
            Contact Support
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
