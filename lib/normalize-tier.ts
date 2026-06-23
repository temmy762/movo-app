/**
 * Normalizes any vehicle tier string to one of the three valid Movo tiers.
 * Handles values coming from onboarding forms (e.g. "ECONOMY", "Luxury", "Black")
 * or admin input that may not match the canonical lowercase values.
 */

const PREMIUM_ALIASES = new Set(["premium", "business", "comfort", "exec", "executive class"]);
const BLACK_ALIASES   = new Set(["black", "luxury", "executive", "vip", "prive", "privé", "private", "black car"]);

export function normalizeTier(raw: string | null | undefined): "classic" | "premium" | "black" {
  if (!raw) return "classic";
  const lower = raw.trim().toLowerCase();

  if (BLACK_ALIASES.has(lower))   return "black";
  if (PREMIUM_ALIASES.has(lower)) return "premium";
  if (lower === "classic" || lower === "economy" || lower === "standard" || lower === "regular") return "classic";

  // Prefix matching for partial strings like "prive black"
  if (lower.includes("black") || lower.includes("luxury") || lower.includes("executive") || lower.includes("vip")) return "black";
  if (lower.includes("premium") || lower.includes("business") || lower.includes("comfort"))                        return "premium";

  return "classic";
}
