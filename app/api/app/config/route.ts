/**
 * GET /api/app/config — read by the mobile apps on launch.
 *
 * minVersion: builds older than this must update before continuing (bump it
 * when an API change would break older app builds). Launch flags mirror
 * lib/launchConfig.ts so the apps hide the same services as the web.
 */
import { NextResponse } from "next/server";
import {
  IN_CITY_RIDES_ENABLED,
  AIRPORT_TRANSFER_ENABLED,
  HOURLY_CHARTER_ENABLED,
  VEHICLE_RENTAL_ENABLED,
} from "@/lib/launchConfig";

const MIN_VERSION = { chauffeur: "1.0.0", customer: "1.0.0" };

export async function GET() {
  return NextResponse.json(
    {
      minVersion: MIN_VERSION,
      launch: {
        safeRide: true,
        inCity: IN_CITY_RIDES_ENABLED,
        airport: AIRPORT_TRANSFER_ENABLED,
        hourly: HOURLY_CHARTER_ENABLED,
        rental: VEHICLE_RENTAL_ENABLED,
      },
      timeZone: "America/Winnipeg",
      currency: "CAD",
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
