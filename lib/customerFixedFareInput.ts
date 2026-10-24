import { geocodeAddress } from "@/lib/geocoding";

export const FIXED_FARE_TIERS = ["classic", "premium", "black"] as const;

export type FixedFareInput = {
  label?: unknown; pickup?: unknown; dropoff?: unknown;
  tier?: unknown; fare?: unknown; weekdays?: unknown; active?: unknown;
};

type Parsed =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Validates admin input for a customer fixed fare. With `partial`, only the
 * fields present are checked (PATCH). Addresses are geocoded here so the
 * estimate can match on coordinates.
 */
export async function parseFixedFareInput(body: FixedFareInput, partial = false): Promise<Parsed> {
  const data: Record<string, unknown> = {};
  const has = (k: keyof FixedFareInput) => !partial || body[k] !== undefined;

  if (has("label")) {
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!label) return { ok: false, error: "Give the route a name, e.g. \"Morning — Home to Work\"" };
    data.label = label.slice(0, 80);
  }
  for (const end of ["pickup", "dropoff"] as const) {
    if (!has(end)) continue;
    const address = typeof body[end] === "string" ? (body[end] as string).trim() : "";
    if (!address) return { ok: false, error: `${end === "pickup" ? "Pickup" : "Drop-off"} address is required` };
    const point = await geocodeAddress(address);
    if (!point) return { ok: false, error: `Couldn't find the ${end === "pickup" ? "pickup" : "drop-off"} address on the map. Add the city, e.g. "${address}, Winnipeg, MB".` };
    data[end] = address;
    data[`${end}Lat`] = point.lat;
    data[`${end}Lng`] = point.lng;
  }
  if (has("tier")) {
    if (!FIXED_FARE_TIERS.includes(body.tier as (typeof FIXED_FARE_TIERS)[number])) {
      return { ok: false, error: "Choose a service: Standard, Executive or Concierge" };
    }
    data.tier = body.tier;
  }
  if (has("fare")) {
    const fare = Number(body.fare);
    if (!Number.isFinite(fare) || fare <= 0 || fare > 10_000) return { ok: false, error: "Enter a fare before GST greater than $0" };
    data.fare = Math.round(fare * 100) / 100;
  }
  if (has("weekdays")) {
    const days = Array.isArray(body.weekdays) ? [...new Set(body.weekdays.map(Number))].filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [];
    if (!days.length) return { ok: false, error: "Pick at least one day" };
    data.weekdays = days.sort();
  }
  if (body.active !== undefined) data.active = !!body.active;

  return { ok: true, data };
}
