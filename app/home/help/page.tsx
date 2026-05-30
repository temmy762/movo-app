"use client";

import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";

const helpTopics = [
  {
    id: "booking",
    title: "Booking a Ride",
    description: "Learn how to book different types of rides",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: "payment",
    title: "Payment & Pricing",
    description: "Understanding fares, payment methods, and receipts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    id: "safety",
    title: "Safety Features",
    description: "Emergency contacts, live tracking, and incident reporting",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: "cancellation",
    title: "Cancellations & Refunds",
    description: "How to cancel rides and refund policies",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    id: "account",
    title: "Account Settings",
    description: "Manage your profile, preferences, and notifications",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const faqs = [
  {
    question: "How do I book a ride?",
    answer: "Tap 'Where to?' on the home screen, enter your destination, select your preferred service tier, and confirm your booking.",
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept credit/debit cards, mobile money, and cash payments. You can manage payment methods in your profile settings.",
  },
  {
    question: "How do I cancel a ride?",
    answer: "Go to your Rides tab, select the upcoming ride you want to cancel, and tap 'Cancel Ride'. Cancellation fees may apply depending on timing.",
  },
  {
    question: "How can I contact my driver?",
    answer: "Once your ride is confirmed, you can call or message your driver directly through the app from the ride tracking screen.",
  },
  {
    question: "What is the VIP tier?",
    answer: "VIP tier offers our premium luxury vehicles with professional chauffeurs, complimentary amenities, and priority booking.",
  },
];

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(90deg, #333333 0%, #2D0A53 30%, #8B7500 60%)" }}
      >
        <button
          onClick={() => router.push("/home")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-semibold">Help Center</h1>
      </div>

      {/* Search */}
      <div className="px-4 py-4 bg-white border-b">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search for help..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D0A53]"
          />
        </div>
      </div>

      {/* Help Topics */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Help Topics</h2>
        <div className="grid grid-cols-1 gap-3">
          {helpTopics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => alert(`${topic.title} - Coming soon!`)}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-[#2D0A53] transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[#2D0A53]">
                {topic.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{topic.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{topic.description}</p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="px-4 pb-24">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden group"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                <span className="text-sm font-medium text-gray-900 dark:text-white pr-4">{faq.question}</span>
                <svg
                  className="shrink-0 transition-transform group-open:rotate-180"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{faq.answer}</div>
            </details>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="px-4 pb-24">
        <div className="bg-gradient-to-r from-[#2D0A53] to-[#8B7500] rounded-2xl p-4 text-white">
          <h3 className="font-semibold mb-1">Still need help?</h3>
          <p className="text-sm text-white/80 mb-3">Our support team is available 24/7</p>
          <button
            onClick={() => router.push("/home/report-incident")}
            className="w-full py-3 bg-white text-[#2D0A53] rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
