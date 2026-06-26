"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSocket, SOCKET_EVENTS } from "@/context/SocketContext";

type Message = {
  id: string;
  text: string;
  sender: "driver" | "rider";
  createdAt: string;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]   = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const { join, on } = useSocket();

  const loadMessages = useCallback(() => {
    if (!bookingId) return;
    fetch(`/api/bookings/${bookingId}/messages`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => {});
  }, [bookingId]);

  /* Load history once, then receive new messages via socket */
  useEffect(() => {
    loadMessages();
    if (!bookingId) return;
    join({ role: "driver", bookingId });
    const unsub = on(SOCKET_EVENTS.MESSAGE_NEW, (data) => {
      const m = data as { bookingId: string; id: string; sender: string; text: string; createdAt: string };
      if (m.bookingId !== bookingId) return;
      setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m as Message]);
    });
    return () => { unsub(); if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !bookingId || sending) return;
    setSending(true);
    setInput("");
    await fetch(`/api/bookings/${bookingId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => {});
    setSending(false);
    loadMessages();
  }

  return (
    <div className="h-full flex flex-col bg-white" style={{ fontFamily: "var(--font-body)" }}>

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
            <p className="text-[15px] font-bold text-gray-900">
              {bookingId ? `Booking #${bookingId.slice(0, 8)}` : "Chat"}
            </p>
            <p className="text-[11px]" style={{ background: "linear-gradient(90deg,#131936,#C6BFB2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Live Chat</p>
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
        {!bookingId && (
          <p className="text-center text-[13px] text-gray-400 mt-8">No active booking. Open chat from your ride screen.</p>
        )}
        {bookingId && messages.length === 0 && (
          <p className="text-center text-[13px] text-gray-400 mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender === "driver";
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-1`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
              )}
              <div
                className="max-w-[75%] px-4 py-2.5 rounded-2xl text-[14px] leading-snug whitespace-pre-line"
                style={
                  isMe
                    ? { background: "linear-gradient(135deg,#131936,#C6BFB2)", color: "white", borderBottomRightRadius: "4px" }
                    : { background: "#f3f4f6", color: "#1f2937", borderBottomLeftRadius: "4px" }
                }
              >
                {msg.text}
              </div>
              <p className="text-[10px] text-gray-400">{fmt(msg.createdAt)}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100">
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: "linear-gradient(135deg, #0A0A0F 0%, #131936 50%, #2A3055 100%)" }}
        >
          <input
            type="text"
            className="flex-1 bg-transparent text-white placeholder-white/50 text-[14px] focus:outline-none"
            style={{ WebkitTextFillColor: "white", caretColor: "white" }}
            placeholder={bookingId ? "Write your message…" : "No active booking"}
            disabled={!bookingId || sending}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            suppressHydrationWarning
          />
          <button className="no-hover-fx shrink-0 disabled:opacity-50" onClick={sendMessage} disabled={!bookingId || sending}>
            {sending
              ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none" /></svg>
            }
          </button>
        </div>
      </div>

    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#131936] rounded-full animate-spin" />
      </div>
    }>
      <ChatInner />
    </Suspense>
  );
}
