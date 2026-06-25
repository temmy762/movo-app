import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const doc = await prisma.onboardingDocument.findUnique({
    where: { id },
    select: { fileName: true, fileUrl: true },
  });

  if (!doc?.fileUrl) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  /* Handle base64 data URL: "data:<mime>;base64,<data>" */
  const dataUrlMatch = doc.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const mimeType  = dataUrlMatch[1];
    const buffer    = Buffer.from(dataUrlMatch[2], "base64");
    const ext       = doc.fileName.split(".").pop() ?? "";
    const safeName  = encodeURIComponent(doc.fileName || `document.${ext}`);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":        mimeType,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Content-Length":      buffer.length.toString(),
        "Cache-Control":       "private, max-age=3600",
      },
    });
  }

  /* Fallback: regular URL — redirect to it */
  return NextResponse.redirect(doc.fileUrl);
}
