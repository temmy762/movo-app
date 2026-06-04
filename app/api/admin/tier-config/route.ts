import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const configs = await prisma.vehicleTierConfig.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error("Error fetching tier configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch tier configurations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { tier, name, image, price } = await req.json();

    if (!tier || !name || !image || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: tier, name, image, price" },
        { status: 400 }
      );
    }

    const config = await prisma.vehicleTierConfig.create({
      data: { tier, name, image, price },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error("Error creating tier config:", error);
    return NextResponse.json(
      { error: "Failed to create tier configuration" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { tier, name, image, price } = await req.json();

    if (!tier) {
      return NextResponse.json(
        { error: "tier is required" },
        { status: 400 }
      );
    }

    const config = await prisma.vehicleTierConfig.update({
      where: { tier },
      data: {
        ...(name && { name }),
        ...(image && { image }),
        ...(price !== undefined && { price }),
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating tier config:", error);
    return NextResponse.json(
      { error: "Failed to update tier configuration" },
      { status: 500 }
    );
  }
}
