/**
 * setTimeout for long delays. Node caps timers at 2^31−1 ms (~24.8 days):
 * anything longer overflows and fires IMMEDIATELY — so a ride reserved a month
 * out had its no-chauffeur timeout fire at booking time (cancel + refund) and
 * a far-future Safe Ride was dispatched straight away. Chains shorter waits.
 */
const MAX_DELAY = 2_147_483_647;

export function setLongTimeout(fn: () => void, delayMs: number): void {
  if (delayMs > MAX_DELAY) {
    setTimeout(() => setLongTimeout(fn, delayMs - MAX_DELAY), MAX_DELAY);
    return;
  }
  setTimeout(fn, Math.max(0, delayMs));
}
