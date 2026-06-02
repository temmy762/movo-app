import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);

    // Only admins can view onboardings
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING"; // PENDING, APPROVED, REJECTED, UNDER_REVIEW
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch onboardings
    const onboardings = await prisma.driverOnboarding.findMany({
      where: {
        adminStatus: status as any,
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            country: true,
            city: true,
            status: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            fileName: true,
            status: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await prisma.driverOnboarding.count({
      where: { adminStatus: status as any },
    });

    // Format response
    const formatted = onboardings.map((ob) => ({
      id: ob.id,
      type: ob.type,
      status: ob.adminStatus,
      submittedAt: ob.submittedAt,
      reviewedAt: ob.reviewedAt,
      reviewedBy: ob.reviewedBy,
      adminNote: ob.adminNote,
      
      driver: ob.driver,
      
      // Fleet partner info
      ...(ob.type === "FLEET" && {
        company: {
          name: ob.companyName,
          legalForm: ob.legalForm,
          country: ob.country,
          city: ob.city,
          street: ob.street,
          postalCode: ob.postalCode,
          taxId: ob.taxId,
          vatId: ob.vatId,
          registrationNumber: ob.registrationNumber,
        },
        fleet: {
          size: ob.fleetSize,
          vehicleDescriptions: ob.vehicleDescriptions,
        },
        firstVehicle: {
          year: ob.firstVehicleYear,
          brand: ob.firstVehicleBrand,
          model: ob.firstVehicleModel,
          class: ob.firstVehicleClass,
          color: ob.firstVehicleColor,
          plate: ob.firstVehiclePlate,
          vin: ob.firstVehicleVin,
        },
        firstChauffeur: {
          firstName: ob.firstChauffeurFirstName,
          lastName: ob.firstChauffeurLastName,
          email: ob.firstChauffeurEmail,
          phone: ob.firstChauffeurPhone,
        },
      }),
      
      documents: ob.documents,
    }));

    return NextResponse.json({
      data: formatted,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Onboarding list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch onboardings" },
      { status: 500 }
    );
  }
}
