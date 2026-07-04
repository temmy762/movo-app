/**
 * Server-side Google Maps API key.
 *
 * The Distance Matrix and Geocoding web-service APIs REJECT keys that carry
 * HTTP-referrer restrictions (that's the browser key, NEXT_PUBLIC_*). Using
 * the referrer-restricted key server-side returns REQUEST_DENIED
 * ("API keys with referer restrictions cannot be used with this API"), which
 * silently degrades fares to the flat fallback and leaves bookings without
 * coordinates.
 *
 * Provision a SEPARATE key in Google Cloud Console with NO restrictions (or an
 * IP restriction pinned to the VPS) and Distance Matrix + Geocoding enabled,
 * then set it as GOOGLE_MAPS_SERVER_API_KEY. Several legacy names are accepted
 * so whichever the ops team already set is honoured — but the browser
 * NEXT_PUBLIC_ key is only a last-resort fallback and will fail if restricted.
 */
export const GOOGLE_MAPS_SERVER_KEY =
  process.env.GOOGLE_MAPS_SERVER_API_KEY ||
  process.env.GOOGLE_MAPS_SERVER_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";
