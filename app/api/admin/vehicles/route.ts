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
    const { clientName, carMake, carModel, carType, carPlate, driverId } = body;

    console.log("[Admin Vehicles] Creating vehicle with:", {
      clientName,
      carMake,
      carModel,
      carType,
      carPlate,
      driverId,
    });

    // Validate required fields
    if (!carMake || !carModel || !carPlate) {
      const missing: string[] = [];
      if (!carMake) missing.push("carMake");
      if (!carModel) missing.push("carModel");
      if (!carPlate) missing.push("carPlate");
      
      console.warn("[Admin Vehicles] Missing fields:", missing);
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // If driverId is provided, verify the driver exists
    if (driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        console.warn("[Admin Vehicles] Driver not found:", driverId);
        return NextResponse.json(
          { error: "Driver not found" },
          { status: 404 }
        );
      }

      // Check if driver already has a vehicle
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { driverId },
      });

      if (existingVehicle) {
        console.warn("[Admin Vehicles] Driver already has a vehicle:", driverId);
        return NextResponse.json(
          { error: "Driver already has a vehicle assigned" },
          { status: 400 }
        );
      }
    } else {
      // If no driverId provided, we need to create a temporary driver or return error
      console.warn("[Admin Vehicles] No driverId provided - cannot create vehicle without driver");
      return NextResponse.json(
        { error: "driverId is required. Please assign a driver to this vehicle." },
        { status: 400 }
      );
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        make: carMake,
        model: carModel,
        plate: carPlate,
        tier: carType || "classic",
        year: new Date().getFullYear(),
        driverId: driverId,
      },
    });

    console.log("[Admin Vehicles] Vehicle created successfully:", {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      plate: vehicle.plate,
      driverId: vehicle.driverId,
    });

    return NextResponse.json({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      plate: vehicle.plate,
      tier: vehicle.tier,
      driverId: vehicle.driverId,
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
