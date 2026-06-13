import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const intent = searchParams.get("intent") === "signup" ? "signup" : "login";
  const errorPath = intent === "signup" ? "/onboarding/register" : "/onboarding/login";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${BASE_URL}${errorPath}?error=oauth_config`);
  }

  const redirectUri = `${BASE_URL}/api/auth/google/callback`;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", intent);

  return NextResponse.redirect(url.toString());
}
