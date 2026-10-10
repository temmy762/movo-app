import { createHmac, timingSafeEqual } from "crypto";

/**
 * Server-signed fare quotes.
 *
 * The estimate route prices a trip and signs the result; booking creation only
 * trusts amounts that come back inside a valid signature. Without this the
 * browser chose the fare, created a PaymentIntent for that amount and posted
 * the same numbers to /api/bookings — so a rider could pay any price.
 */

export type FareQuote = {
  pickup: string;
  dropoff: string;
  tier: string;
  fare: number;
  serviceFee: number;
  gst: number;
  additionalStopFee: number;
  airportFee: number;
  total: number;
  /* Stop addresses (in order) the price includes */
  stops?: string[];
  /* Safe Ride only: internal breakdown + the chauffeur's locked payout,
     signed with the price so the booking stores exactly what was quoted */
  safeRide?: {
    servicePortion: number;
    returnAllowance: number;
    chauffeurPayout: number;
    snapshot: Record<string, unknown>;
  };
  exp: number;
};

/* Generous on purpose: the rider may leave checkout open for a while, and an
   expired quote after a successful charge would leave them paid with no ride. */
const QUOTE_TTL_MS = 24 * 60 * 60 * 1000;

function signingKey(): Buffer {
  const secret = process.env.QUOTE_SIGNING_SECRET ?? process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("No QUOTE_SIGNING_SECRET or STRIPE_SECRET_KEY configured");
  /* Derive a purpose-specific key so the raw secret is never used directly */
  return createHmac("sha256", secret).update("movo-fare-quote-v1").digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function signFareQuote(quote: Omit<FareQuote, "exp">): string {
  const payload = Buffer.from(
    JSON.stringify({ ...quote, exp: Date.now() + QUOTE_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the quote if the signature is valid and it hasn't expired, else null. */
export function verifyFareQuote(token: unknown): FareQuote | null {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const quote = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as FareQuote;
    if (typeof quote.exp !== "number" || quote.exp < Date.now()) return null;
    return quote;
  } catch {
    return null;
  }
}
