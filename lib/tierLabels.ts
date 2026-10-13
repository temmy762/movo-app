import { normalizeTier } from "@/lib/normalizeTier";

/* Customer-facing service names — must match what the app shows */
const LABELS: Record<string, string> = {
  classic: "Standard",
  premium: "Executive",
  black:   "Concierge",
  care:    "Safe Ride",
};

/** "In-City · Executive", "Safe Ride", … for emails and receipts */
export function serviceLabel(carTier: string | null | undefined, bookingType?: string | null): string {
  const tier = normalizeTier(carTier);
  if (bookingType === "CARE" || tier === "care") return "Safe Ride";
  return `In-City · ${LABELS[tier] ?? "Standard"}`;
}
