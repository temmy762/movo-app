import { NextRequest, NextResponse } from "next/server";
import { deleteSession, buildClearCookieHeader } from "@/lib/session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("movo_session")?.value;
  if (token) await deleteSession(token);

  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": buildClearCookieHeader() } }
  );
}
