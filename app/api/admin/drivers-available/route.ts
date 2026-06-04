import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all ACTIVE drivers without vehicles
    const drivers = await prisma.driver.findMany({
      where: {
        status: "ACTIVE",
        vehicle: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: { firstName: "asc" },
    });

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("Error fetching available drivers:", error);
    return NextResponse.json(
      { error: "Failed to fetch available drivers" },
      { status: 500 }
    );
  }
}
