/**
 * Safe Ride booking draft — carries the details gathered across the 4-step
 * booking flow (Where → Vehicle → Contact & authorization → Confirm & pay)
 * between pages. Client-side only; lives for the browser tab.
 */

export type SafeRideVehicle = {
  make: string;
  model: string;
  year: string;
  colour: string;
  plate: string;
  transmission: "Automatic" | "Manual";
};

export type SafeRideContact = {
  /** true when the account holder is booking for someone else */
  forSomeoneElse: boolean;
  riderName: string;
  riderPhone: string;
  receiptEmail: string;
};

export type SafeRideDraft = {
  pickupInstructions?: string;
  passengers?: number;
  vehicle?: SafeRideVehicle;
  roadworthy?: boolean;
  contact?: SafeRideContact;
  /** All three authorization boxes ticked */
  consented?: boolean;
  /** In-City: someone other than the account holder is riding */
  inCityRider?: { name: string; phone: string } | null;
  /** Stop addresses the paid quote was priced for (survives a 3DS redirect) */
  stops?: string[];
};

const KEY = "movo_safe_ride_draft";

export function getSafeRideDraft(): SafeRideDraft {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SafeRideDraft) : {};
  } catch {
    return {};
  }
}

export function saveSafeRideDraft(patch: Partial<SafeRideDraft>): SafeRideDraft {
  const next = { ...getSafeRideDraft(), ...patch };
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode — draft just won't persist */ }
  return next;
}

export function clearSafeRideDraft() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function vehicleLabel(v: SafeRideVehicle | null | undefined): string {
  if (!v) return "";
  return [v.colour, v.make, v.model].filter(Boolean).join(" ");
}

/**
 * Extra details sent with the booking after payment: stops (must match the
 * quote), passengers, pickup instructions, the rider (when booking for
 * someone else) and — for Safe Ride — the vehicle + receipt email.
 */
export function bookingExtras(isCare: boolean, stops: string[]): Record<string, unknown> {
  const d = getSafeRideDraft();
  const extras: Record<string, unknown> = {
    stops,
    ...(d.passengers ? { passengers: d.passengers } : {}),
    ...(d.pickupInstructions ? { pickupInstructions: d.pickupInstructions } : {}),
  };
  if (isCare) {
    if (d.contact) {
      extras.riderName = d.contact.riderName;
      extras.riderPhone = d.contact.riderPhone;
      extras.receiptEmail = d.contact.receiptEmail;
    }
    if (d.vehicle) extras.vehicle = d.vehicle;
  } else if (d.inCityRider?.name) {
    extras.riderName = d.inCityRider.name;
    extras.riderPhone = d.inCityRider.phone;
  }
  return extras;
}
