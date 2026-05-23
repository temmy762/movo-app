import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "movo_session";
const SESSION_DURATION_DAYS = 7;

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function buildSetCookieHeader(token: string): string {
  const maxAge = SESSION_DURATION_DAYS * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function buildClearCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

// ─── Token creation ───────────────────────────────────────────────────────────

export async function createSession(
  role: Role,
  userId?: string,
  driverId?: string
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: {
      token,
      role,
      expiresAt,
      ...(userId ? { userId } : {}),
      ...(driverId ? { driverId } : {}),
    },
  });

  return token;
}

// ─── Session lookup ───────────────────────────────────────────────────────────

export type SessionPayload = {
  id: string;
  role: Role;
  userId: string | null;
  driverId: string | null;
  expiresAt: Date;
};

export async function getSession(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = resolveToken(req);
  if (!token) return null;
  return lookupSession(token);
}

export async function getSessionFromCookieHeader(
  cookieHeader: string | null
): Promise<SessionPayload | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`)
  );
  const token = match?.[1];
  if (!token) return null;
  return lookupSession(token);
}

export async function deleteSession(token: string): Promise<void> {
  try {
    await prisma.session.delete({ where: { token } });
  } catch {
    // already gone — no-op
  }
}

// ─── Internals ────────────────────────────────────────────────────────────────

function resolveToken(req: NextRequest): string | null {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie) return cookie;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  return null;
}

async function lookupSession(token: string): Promise<SessionPayload | null> {
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  return {
    id: session.id,
    role: session.role,
    userId: session.userId,
    driverId: session.driverId,
    expiresAt: session.expiresAt,
  };
}
