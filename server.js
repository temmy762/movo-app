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
    /* Client tells us who they are so we add them to the right rooms */
    socket.on("join", ({ role, id, bookingId, tier }) => {
      if (role === "driver" && id)  socket.join(`driver:${id}`);
      if (role === "user"   && id)  socket.join(`user:${id}`);
      if (role === "admin")         socket.join("admin");
      if (bookingId)                socket.join(`booking:${bookingId}`);
      if (tier)                     socket.join(`tier:${tier}`);
    });

    socket.on("leave_booking", ({ bookingId }) => {
      if (bookingId) socket.leave(`booking:${bookingId}`);
    });
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> MOVO ready on http://localhost:${port} [${dev ? "dev" : "prod"}]`);
  });
});
