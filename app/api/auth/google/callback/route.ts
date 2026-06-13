import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader } from "@/lib/session";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function loginRedirect(token: string) {
  return NextResponse.redirect(`${BASE_URL}/home`, {
    headers: { "Set-Cookie": buildSetCookieHeader(token) },
  });
}

function errorRedirect(page: "login" | "register", code: string) {
  const path = page === "register" ? "/onboarding/register" : "/onboarding/login";
  return NextResponse.redirect(`${BASE_URL}${path}?error=${code}`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const googleError = searchParams.get("error");
  const state = searchParams.get("state");
  const intent: "login" | "signup" = state === "signup" ? "signup" : "login";
  const errorPage = intent === "signup" ? "register" : "login";

  if (googleError) {
    return errorRedirect(errorPage, googleError === "access_denied" ? "google_cancelled" : "google_provider_failed");
  }

  if (!code) {
    return errorRedirect(errorPage, "google_cancelled");
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
      return errorRedirect(errorPage, "google_token_failed");
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) {
      return errorRedirect(errorPage, "google_token_failed");
    }

    const googleUser = await userRes.json();

    if (!googleUser.email) {
      return errorRedirect(errorPage, "google_no_email");
    }

    const googleId: string = googleUser.id;

    if (intent === "login") {
      const byGoogleId = await prisma.user.findUnique({ where: { googleId } });
      if (byGoogleId) {
        const token = await createSession("USER", byGoogleId.id);
        return loginRedirect(token);
      }

      const byEmail = await prisma.user.findUnique({ where: { email: googleUser.email } });
      if (byEmail) {
        // Link Google account if not already linked, then log in
        if (!byEmail.googleId) {
          await prisma.user.update({ where: { id: byEmail.id }, data: { googleId } });
        }
        const token = await createSession("USER", byEmail.id);
        return loginRedirect(token);
      }

      return errorRedirect("login", "google_not_linked");
    }

    if (intent === "signup") {
      const byGoogleId = await prisma.user.findUnique({ where: { googleId } });
      if (byGoogleId) {
        const token = await createSession("USER", byGoogleId.id);
        return loginRedirect(token);
      }

      const byEmail = await prisma.user.findUnique({ where: { email: googleUser.email } });
      if (byEmail) {
        // Account already exists — link Google and log in
        if (!byEmail.googleId) {
          await prisma.user.update({ where: { id: byEmail.id }, data: { googleId } });
        }
        const token = await createSession("USER", byEmail.id);
        return loginRedirect(token);
      }

      const password = await bcrypt.hash(crypto.randomUUID(), 12);
      const newUser = await prisma.user.create({
        data: {
          firstName: googleUser.given_name ?? googleUser.name?.split(" ")[0] ?? "User",
          lastName: googleUser.family_name ?? googleUser.name?.split(" ").slice(1).join(" ") ?? "",
          email: googleUser.email,
          googleId,
          password,
        },
      });
      const token = await createSession("USER", newUser.id);
      return loginRedirect(token);
    }

    return errorRedirect(errorPage, "google_token_failed");
  } catch {
    return errorRedirect(errorPage, "google_token_failed");
  }
}
