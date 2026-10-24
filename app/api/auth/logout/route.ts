import { NextRequest, NextResponse } from "next/server";
import { deleteSession, buildClearCookieHeader, resolveToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  /* Cookie (web) or Bearer token (mobile apps) */
  const token = resolveToken(req);
  if (token) await deleteSession(token);

  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": buildClearCookieHeader() } }
  );
}
