import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, buildSetCookieHeader } from "@/lib/session";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function loginRedirect(token: string, destination: string = "/home") {
  /* Only allow relative paths to prevent open redirect */
  const safe = destination.startsWith("/") ? destination : "/home";
  return NextResponse.redirect(`${BASE_URL}${safe}`, {
    headers: { "Set-Cookie": buildSetCookieHeader(token) },
  });
}

function errorRedirect(page: "login" | "register", code: string, redirect?: string) {
  const path   = page === "register" ? "/user/register" : "/user/login";
  const params = new URLSearchParams({ error: code });
  if (redirect) params.set("redirect", redirect);
  return NextResponse.redirect(`${BASE_URL}${path}?${params.toString()}`);
}

function decodeState(raw: string | null): { intent: "login" | "signup"; redirect: string } {
  try {
    if (!raw) return { intent: "login", redirect: "" };
    const obj = JSON.parse(Buffer.from(raw, "base64url").toString());
    return {
      intent:   obj.intent === "signup" ? "signup" : "login",
      redirect: typeof obj.redirect === "string" ? obj.redirect : "",
    };
  } catch {
    /* Legacy state was just the intent string */
    return { intent: raw === "signup" ? "signup" : "login", redirect: "" };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code        = searchParams.get("code");
  const googleError = searchParams.get("error");
  const { intent, redirect } = decodeState(searchParams.get("state"));
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

    const dest = redirect || "/home";

    if (intent === "login") {
      const byGoogleId = await prisma.user.findUnique({ where: { googleId } });
      if (byGoogleId) {
        const token = await createSession("USER", byGoogleId.id);
        return loginRedirect(token, dest);
      }

      const byEmail = await prisma.user.findUnique({ where: { email: googleUser.email } });
      if (byEmail) {
        if (!byEmail.googleId) {
          await prisma.user.update({ where: { id: byEmail.id }, data: { googleId } });
        }
        const token = await createSession("USER", byEmail.id);
        return loginRedirect(token, dest);
      }

      return errorRedirect("login", "google_not_linked", redirect);
    }

    if (intent === "signup") {
      const byGoogleId = await prisma.user.findUnique({ where: { googleId } });
      if (byGoogleId) {
        const token = await createSession("USER", byGoogleId.id);
        return loginRedirect(token, dest);
      }

      const byEmail = await prisma.user.findUnique({ where: { email: googleUser.email } });
      if (byEmail) {
        if (!byEmail.googleId) {
          await prisma.user.update({ where: { id: byEmail.id }, data: { googleId } });
        }
        const token = await createSession("USER", byEmail.id);
        return loginRedirect(token, dest);
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
      return loginRedirect(token, dest);
    }

    return errorRedirect(errorPage, "google_token_failed");
  } catch {
    return errorRedirect(errorPage, "google_token_failed");
  }
}
