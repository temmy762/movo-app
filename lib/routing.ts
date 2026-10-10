/* Driving distance/time via Google Distance Matrix (server-side key). Shared by
   the fare estimate and mid-trip stop pricing. */
import { GOOGLE_MAPS_SERVER_KEY } from "@/lib/googleMapsKey";

export type Leg = { km: number; min: number };

/* One leg, or null if Google can't route it */
export async function routeLeg(origin: string, destination: string): Promise<Leg | null> {
  if (!GOOGLE_MAPS_SERVER_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=metric&key=${GOOGLE_MAPS_SERVER_KEY}`;
    const data = await (await fetch(url)).json();
    const el = data?.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") {
      console.error(`[routing] Distance Matrix failed (top-level: ${data?.status ?? "?"}, element: ${el?.status ?? "missing"})`);
      return null;
    }
    return { km: el.distance.value / 1000, min: Math.ceil(el.duration.value / 60) };
  } catch (e) {
    console.error("[routing] Distance Matrix request failed", e);
    return null;
  }
}

/* Total for point → point → … (null if any leg fails) */
export async function routeVia(points: string[]): Promise<Leg | null> {
  const legs = await Promise.all(points.slice(1).map((to, i) => routeLeg(points[i], to)));
  if (legs.some(l => !l)) return null;
  return legs.reduce<Leg>((acc, l) => ({ km: acc.km + l!.km, min: acc.min + l!.min }), { km: 0, min: 0 });
}
