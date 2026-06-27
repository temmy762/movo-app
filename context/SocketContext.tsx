"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io as ioClient, Socket } from "socket.io-client";
import { SOCKET_EVENTS, type SocketEventName } from "@/lib/socket/events";

interface SocketContextValue {
  socket:    Socket | null;
  connected: boolean;
  join:      (opts: { role: string; id?: string; bookingId?: string; tier?: string }) => void;
  leaveBooking: (bookingId: string) => void;
  on:        (event: SocketEventName, cb: (data: unknown) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket:    null,
  connected: false,
  join:      () => {},
  leaveBooking: () => {},
  on:        () => () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = ioClient(window.location.origin, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });

    s.on("connect",    () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    socketRef.current = s;
    return () => { s.disconnect(); };
  }, []);

  const join = useCallback(
    (opts: { role: string; id?: string; bookingId?: string; tier?: string }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("join", opts);
      } else {
        // Socket not connected yet — queue the join for when it connects
        const wait = setInterval(() => {
          if (socketRef.current?.connected) {
            clearInterval(wait);
            socketRef.current.emit("join", opts);
          }
        }, 500);
        // Give up after 10 seconds
        setTimeout(() => clearInterval(wait), 10000);
      }
    },
    []
  );

  const leaveBooking = useCallback((bookingId: string) => {
    socketRef.current?.emit("leave_booking", { bookingId });
  }, []);

  const on = useCallback(
    (event: SocketEventName, cb: (data: unknown) => void) => {
      // Register listener immediately — socket.io-client buffers events
      // so even if socketRef.current is briefly null, reconnection will re-sync
      if (socketRef.current) {
        socketRef.current.on(event, cb);
        return () => { socketRef.current?.off(event, cb); };
      }
      // Fallback: wait for socket to be available
      let cleanup: (() => void) | null = null;
      const wait = setInterval(() => {
        if (socketRef.current) {
          clearInterval(wait);
          socketRef.current.on(event, cb);
          cleanup = () => { socketRef.current?.off(event, cb); };
        }
      }, 500);
      setTimeout(() => clearInterval(wait), 10000);
      return () => { cleanup?.(); clearInterval(wait); };
    },
    []
  );

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, join, leaveBooking, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

export { SOCKET_EVENTS };
