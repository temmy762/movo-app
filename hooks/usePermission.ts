"use client";

import { useState, useEffect, useCallback } from "react";

export type PermissionStatus = "unknown" | "granted" | "denied" | "prompt";

/* Maps our app permission names to the Permissions API names */
const QUERY_MAP: Partial<Record<string, PermissionName>> = {
  geolocation:   "geolocation",
  notifications: "notifications",
  camera:        "camera" as PermissionName,
  microphone:    "microphone" as PermissionName,
};

export function usePermission(type: keyof typeof QUERY_MAP) {
  const [status, setStatus] = useState<PermissionStatus>("unknown");

  /* Query current status without triggering a prompt */
  useEffect(() => {
    const name = QUERY_MAP[type];
    if (!name || typeof navigator === "undefined") return;
    if (!("permissions" in navigator)) { setStatus("prompt"); return; }

    navigator.permissions
      .query({ name })
      .then((result) => {
        setStatus(result.state as PermissionStatus);
        result.onchange = () => setStatus(result.state as PermissionStatus);
      })
      .catch(() => setStatus("prompt"));
  }, [type]);

  /* Actually request the permission — call this AFTER showing the explainer */
  const request = useCallback(async (): Promise<PermissionStatus> => {
    try {
      if (type === "geolocation") {
        return await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => { setStatus("granted"); resolve("granted"); },
            () => { setStatus("denied");  resolve("denied");  },
            { timeout: 10000 }
          );
        });
      }

      if (type === "notifications") {
        const result = await Notification.requestPermission();
        const mapped: PermissionStatus = result === "granted" ? "granted" : result === "denied" ? "denied" : "prompt";
        setStatus(mapped);
        return mapped;
      }

      if (type === "camera" || type === "microphone") {
        const constraints = type === "camera"
          ? { video: true }
          : { audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach((t) => t.stop());
        setStatus("granted");
        return "granted";
      }

      return "unknown";
    } catch {
      setStatus("denied");
      return "denied";
    }
  }, [type]);

  return {
    status,
    isGranted: status === "granted",
    isDenied:  status === "denied",
    isUnknown: status === "unknown" || status === "prompt",
    request,
  };
}
