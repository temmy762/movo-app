import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader } from "@/lib/session";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/onboarding/login?error=oauth`);
  }

  try {
    const redirectUri = `${BASE_URL}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      return NextResponse.redirect(`${BASE_URL}/onboarding/login?error=oauth`);
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(`${BASE_URL}/onboarding/login?error=oauth`);
    }

    let user = await prisma.user.findUnique({ where: { email: googleUser.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName: googleUser.given_name ?? googleUser.name?.split(" ")[0] ?? "User",
          lastName: googleUser.family_name ?? googleUser.name?.split(" ").slice(1).join(" ") ?? "",
          email: googleUser.email,
          password: crypto.randomUUID(),
        },
      });
    }

    const token = await createSession("USER", user.id);

    return NextResponse.redirect(`${BASE_URL}/home`, {
      headers: { "Set-Cookie": buildSetCookieHeader(token) },
    });
  } catch {
    return NextResponse.redirect(`${BASE_URL}/onboarding/login?error=oauth`);
  }
}
