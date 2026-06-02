import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { clientName, carMake, carModel, carType, carPlate } = body;

    // Validate required fields
    if (!clientName || !carMake || !carModel || !carPlate) {
      return NextResponse.json(
        { error: "Missing required fields: clientName, carMake, carModel, carPlate" },
        { status: 400 }
      );
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        make: carMake,
        model: carModel,
        plate: carPlate,
        tier: carType || "ECONOMY",
        year: new Date().getFullYear(),
        color: "Unknown",
      },
    });

    return NextResponse.json({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      plate: vehicle.plate,
      tier: vehicle.tier,
    });
  } catch (e) {
    console.error("Admin vehicle creation error:", e);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
