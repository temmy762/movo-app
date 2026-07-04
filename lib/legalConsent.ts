import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type ConsentDocumentType = "PRIVACY_POLICY" | "TERMS" | "CHAUFFEUR_AGREEMENT";

/** Current version string for each document — bump when the policy content changes
    so historical acceptances stay tied to the version the user actually saw. */
export const CONSENT_VERSIONS: Record<ConsentDocumentType, string> = {
  PRIVACY_POLICY:      "2026-07-04",
  TERMS:                "2026-07-04",
  CHAUFFEUR_AGREEMENT:  "2026-07-04",
};

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/** Records that a user or driver accepted one or more legal documents,
    with the version they saw, a timestamp, and their IP address. */
export async function recordConsent(
  req: NextRequest,
  opts: { userId?: string; driverId?: string; documentTypes: ConsentDocumentType[] },
): Promise<void> {
  const ipAddress = clientIp(req);
  await prisma.consentRecord.createMany({
    data: opts.documentTypes.map((documentType) => ({
      documentType,
      version: CONSENT_VERSIONS[documentType],
      ipAddress,
      userId: opts.userId ?? null,
      driverId: opts.driverId ?? null,
    })),
  });
}
