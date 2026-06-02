import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      console.warn("[Admin Vehicles] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { clientName, carMake, carModel, carType, carPlate } = body;

    console.log("[Admin Vehicles] Creating vehicle with:", {
      clientName,
      carMake,
      carModel,
      carType,
      carPlate,
    });

    // Validate required fields
    if (!clientName || !carMake || !carModel || !carPlate) {
      const missing = [];
      if (!clientName) missing.push("clientName");
      if (!carMake) missing.push("carMake");
      if (!carModel) missing.push("carModel");
      if (!carPlate) missing.push("carPlate");
      
      console.warn("[Admin Vehicles] Missing fields:", missing);
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
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

    console.log("[Admin Vehicles] Vehicle created successfully:", {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      plate: vehicle.plate,
    });

    return NextResponse.json({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      plate: vehicle.plate,
      tier: vehicle.tier,
    });
  } catch (e) {
    console.error("[Admin Vehicles] Error creating vehicle:", {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
