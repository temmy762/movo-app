/* Runs once when the server starts. Dispatch timers live in memory, so after a
   restart (every deploy) they're re-armed from the database. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  /* Not during `next build` (its workers also load this file) */
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  /* Don't hold up startup — the sweep runs right after the server is ready */
  setTimeout(() => {
    import("./lib/dispatch/recoverTimers")
      .then((m) => m.recoverDispatchTimers())
      .catch((e) => console.error("[recover timers]", e));
  }, 5_000);
}
