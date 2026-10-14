/* Driving distance/time via Google Distance Matrix (server-side key). Shared by
   the fare estimate and mid-trip stop pricing. */
import { GOOGLE_MAPS_SERVER_KEY } from "@/lib/googleMapsKey";

export type Leg = { km: number; min: number };

/* unroutable: Google answered, but an address can't be found or driven to
   (vs. a Google outage / key problem, where a flat estimate is acceptable) */
export type LegResult = { leg: Leg | null; unroutable: boolean };

export async function routeLegResult(origin: string, destination: string): Promise<LegResult> {
  if (!GOOGLE_MAPS_SERVER_KEY) return { leg: null, unroutable: false };
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=metric&key=${GOOGLE_MAPS_SERVER_KEY}`;
    const data = await (await fetch(url)).json();
    const el = data?.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") {
      console.error(`[routing] Distance Matrix failed (top-level: ${data?.status ?? "?"}, element: ${el?.status ?? "missing"})`);
      return { leg: null, unroutable: data?.status === "OK" && (el?.status === "NOT_FOUND" || el?.status === "ZERO_RESULTS") };
    }
    return { leg: { km: el.distance.value / 1000, min: Math.ceil(el.duration.value / 60) }, unroutable: false };
  } catch (e) {
    console.error("[routing] Distance Matrix request failed", e);
    return { leg: null, unroutable: false };
  }
}

/* One leg, or null if Google can't route it */
export async function routeLeg(origin: string, destination: string): Promise<Leg | null> {
  return (await routeLegResult(origin, destination)).leg;
}

/* point → point → … */
export async function routeViaResult(points: string[]): Promise<LegResult> {
  const results = await Promise.all(points.slice(1).map((to, i) => routeLegResult(points[i], to)));
  if (results.some(r => r.unroutable)) return { leg: null, unroutable: true };
  if (results.some(r => !r.leg)) return { leg: null, unroutable: false };
  return {
    leg: results.reduce<Leg>((acc, r) => ({ km: acc.km + r.leg!.km, min: acc.min + r.leg!.min }), { km: 0, min: 0 }),
    unroutable: false,
  };
}

/* Total for point → point → … (null if any leg fails) */
export async function routeVia(points: string[]): Promise<Leg | null> {
  return (await routeViaResult(points)).leg;
}
