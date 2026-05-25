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
    const redirectUri = `${BASE_URL}/api/auth/facebook/callback`;

    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", process.env.FACEBOOK_APP_ID!);
    tokenUrl.searchParams.set("client_secret", process.env.FACEBOOK_APP_SECRET!);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.access_token) {
      return NextResponse.redirect(`${BASE_URL}/onboarding/login?error=oauth`);
    }

    const userRes = await fetch(
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${tokens.access_token}`
    );
    const fbUser = await userRes.json();

    if (!fbUser.email) {
      return NextResponse.redirect(`${BASE_URL}/onboarding/login?error=oauth_email`);
    }

    let user = await prisma.user.findUnique({ where: { email: fbUser.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName: fbUser.first_name ?? "User",
          lastName: fbUser.last_name ?? "",
          email: fbUser.email,
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
