export type PlatformTier = "classic" | "premium" | "black";

const MAP: Record<string, PlatformTier> = {
  economy:                         "classic",
  "economy (movo classic)":        "classic",
  "business class":                "classic",
  business:                        "premium",
  "business van":                  "premium",
  "premium (movo premium)":        "premium",
  van:                             "premium",
  "first class":                   "black",
  "first class (movo privé black)":"black",
  "first class (movo prive black)":"black",
  firstclass:                      "black",
  luxury:                          "black",
  classic:                         "classic",
  premium:                         "premium",
  black:                           "black",
};

export function normalizeTier(raw: string | null | undefined): PlatformTier {
  if (!raw) return "classic";
  const key = raw.trim().toLowerCase();
  return MAP[key] ?? "classic";
}
