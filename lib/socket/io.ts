import type { Server } from "socket.io";

/**
 * Returns the Socket.IO server instance attached to the custom HTTP server.
 * Only available in the custom-server (node server.js) context.
 * Returns null gracefully when running without the custom server (e.g. next dev without server.js).
 */
export function getIO(): Server | null {
  return (global as unknown as { io?: Server }).io ?? null;
}
