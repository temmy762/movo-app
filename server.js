/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const { parse }        = require("url");
const next             = require("next");
const { Server }       = require("socket.io");

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app  = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  /* ── Socket.IO ─────────────────────────────────────────────────────────── */
  const io = new Server(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  /* Make io accessible to Next.js API routes via global */
  global.io = io;

  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);
    /* Rooms are granted by the caller's session (web cookie, or the mobile
       apps' token in `auth.token`) — never by what the client claims. The
       client's role/id are ignored; /api/socket/authorize decides. */
    socket.on("join", async (opts = {}) => {
      const { bookingId, tier } = opts || {};
      try {
        const headers = { "Content-Type": "application/json" };
        const cookie = socket.handshake.headers.cookie;
        const token = socket.handshake.auth && socket.handshake.auth.token;
        if (cookie) headers.cookie = cookie;
        if (token)  headers.authorization = `Bearer ${token}`;
        const res = await fetch(`http://127.0.0.1:${port}/api/socket/authorize`, {
          method: "POST",
          headers,
          body: JSON.stringify({ bookingId, tier }),
        });
        const { rooms = [] } = await res.json();
        rooms.forEach((r) => socket.join(r));
        console.log(`[socket] join: ${socket.id} → ${rooms.join(", ") || "(none)"}`);
      } catch (e) {
        console.error("[socket] join authorize failed:", e && e.message);
      }
    });

    socket.on("leave_booking", ({ bookingId }) => {
      if (bookingId) socket.leave(`booking:${bookingId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    });
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> MOVO ready on http://localhost:${port} [${dev ? "dev" : "prod"}]`);
  });
});
