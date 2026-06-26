"use client";

import { useEffect, useRef } from "react";

/**
 * Registers the MOVO service worker and subscribes the browser to Web Push.
 * Call this once in the driver home page and the rider tracking page.
 */
export function usePushSubscription() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    done.current = true;

    (async () => {
      try {
        /* 1 — fetch VAPID public key */
        const res = await fetch("/api/push/vapid-key");
        if (!res.ok) return;
        const { publicKey } = await res.json();
        if (!publicKey) return;

        /* 2 — register service worker */
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;

        /* 3 — request notification permission */
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        /* 4 — subscribe */
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        /* 5 — save subscription on server */
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch (err) {
        console.warn("[Push] Subscription failed:", err);
      }
    })();
  }, []);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
