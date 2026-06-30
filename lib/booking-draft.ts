export interface BookingDraft {
  pickup:     string;
  dropoff:    string;
  date:       string;
  time:       string;
  passengers: number;
  tab:        "oneway" | "hourly" | "airport" | "care";
  tier:       string;
  service:    string;
  savedAt:    number;
}

const DRAFT_KEY = "MOVO_BOOKING_DRAFT";
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function saveBookingDraft(draft: Omit<BookingDraft, "savedAt">): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
}

export function getBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as BookingDraft;
    if (Date.now() - draft.savedAt > DRAFT_TTL) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearBookingDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

export function draftToUrl(draft: BookingDraft): string {
  const p = new URLSearchParams();
  if (draft.pickup)  p.set("pickup",  draft.pickup);
  if (draft.dropoff) p.set("dropoff", draft.dropoff);
  if (draft.date)    p.set("date",    draft.date);
  if (draft.time)    p.set("time",    draft.time);
  p.set("passengers", String(draft.passengers));
  if (draft.tier)    p.set("tier",    draft.tier);
  if (draft.service) p.set("service", draft.service);
  return `/home/pickup/available-cars?${p.toString()}`;
}
