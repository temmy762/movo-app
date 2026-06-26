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
  join:      (opts: { role: string; id?: string; bookingId?: string }) => void;
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
    (opts: { role: string; id?: string; bookingId?: string }) => {
      socketRef.current?.emit("join", opts);
    },
    []
  );

  const leaveBooking = useCallback((bookingId: string) => {
    socketRef.current?.emit("leave_booking", { bookingId });
  }, []);

  const on = useCallback(
    (event: SocketEventName, cb: (data: unknown) => void) => {
      socketRef.current?.on(event, cb);
      return () => { socketRef.current?.off(event, cb); };
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
