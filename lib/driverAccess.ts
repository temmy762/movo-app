import { prisma } from "@/lib/prisma";

/* Only an ACTIVE (approved, not suspended) chauffeur may go online, see ride
   requests or accept rides. The app hid the dashboard from unapproved
   chauffeurs, but the server didn't check — a suspended chauffeur could
   still accept rides. */
export async function isActiveDriver(driverId: string): Promise<boolean> {
  const d = await prisma.driver.findUnique({ where: { id: driverId }, select: { status: true, deletedAt: true } });
  /* Deleted (soft-deleted by admin) chauffeurs are never active */
  return d?.status === "ACTIVE" && !d.deletedAt;
}

export const INACTIVE_DRIVER_ERROR = "Your chauffeur account isn't active. Please contact Movo support.";
