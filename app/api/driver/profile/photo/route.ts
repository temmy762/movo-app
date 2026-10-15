import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sniffImageType } from "@/lib/uploads";

const MAX_BYTES = 2 * 1024 * 1024; /* 2 MB limit */

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image exceeds 2 MB limit" }, { status: 413 });
    }
    /* Checked by content: JPG/PNG/WebP/HEIC/GIF only (no SVG/HTML) */
    const mime = sniffImageType(buffer);
    if (!mime) {
      return NextResponse.json({ error: "Please upload a JPG, PNG or WebP photo" }, { status: 400 });
    }

    const photoUrl = `data:${mime};base64,${buffer.toString("base64")}`;

    await prisma.driver.update({
      where: { id: session.driverId },
      data: { photoUrl },
    });

    return NextResponse.json({ photoUrl });
  } catch (e) {
    console.error("[photo upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.driverId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: session.driverId },
    select: { photoUrl: true },
  });

  return NextResponse.json({ photoUrl: driver?.photoUrl ?? null });
}
