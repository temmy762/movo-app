"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Message = {
  id: number;
  text: string;
  sender: "me" | "other";
  time: string;
};

const initialMessages: Message[] = [
  { id: 1, text: "Hello", sender: "me", time: "12:15pm" },
  { id: 2, text: "Hello Brother\nI will be reach in 10 mins", sender: "other", time: "12:15pm" },
  { id: 3, text: "Okay", sender: "me", time: "12:15pm" },
];

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();
    setMessages((prev) => [...prev, { id: Date.now(), text, sender: "me", time }]);
    setInput("");
  }

  return (
    <div className="h-full flex flex-col bg-white" style={{ fontFamily: "var(--font-poppins)" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <button className="no-hover-fx" onClick={() => router.back()}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#f3f4f6" />
              <polyline points="14 8 10 12 14 16" stroke="#374151" strokeWidth="2.5" fill="none" />
            </svg>
          </button>
          <div>
            <p className="text-[15px] font-bold text-gray-900">Nelson Smith</p>
            <p className="text-[11px]" style={{ background: "linear-gradient(90deg,#2D0A53,#8B7500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Online</p>
          </div>
        </div>
        <button className="no-hover-fx p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <circle cx="12" cy="5" r="1.2" fill="#374151" />
            <circle cx="12" cy="12" r="1.2" fill="#374151" />
            <circle cx="12" cy="19" r="1.2" fill="#374151" />
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === "me" ? "items-end" : "items-start"} gap-1`}>
            {msg.sender === "other" && (
              <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden shrink-0">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
            )}
            <div
              className="max-w-[75%] px-4 py-2.5 rounded-2xl text-[14px] leading-snug whitespace-pre-line"
              style={
                msg.sender === "me"
                  ? { background: "linear-gradient(135deg,#2D0A53,#8B7500)", color: "white", borderBottomRightRadius: "4px" }
                  : { background: "#f3f4f6", color: "#1f2937", borderBottomLeftRadius: "4px" }
              }
            >
              {msg.text}
            </div>
            <p className="text-[10px] text-gray-400">{msg.time}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100">
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
        >
          <input
            type="text"
            className="flex-1 bg-transparent text-white placeholder-white/50 text-[14px] focus:outline-none"
            placeholder="Write Your Message...."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            suppressHydrationWarning
          />
          <button className="no-hover-fx shrink-0" onClick={sendMessage}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}
