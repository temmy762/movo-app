import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: true,
        bookings: {
          select: { id: true, status: true, rating: true, createdAt: true, clientName: true, carName: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    const result = drivers.map(d => {
      const completedBookings = d.bookings.filter(b => b.status === "COMPLETED");
      const ratings = completedBookings.map(b => b.rating).filter((r): r is number => r !== null);
      const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
      const perfLabel = avgRating >= 4.5 ? "Excellent" : avgRating >= 4.0 ? "Good" : avgRating >= 3.0 ? "Average" : avgRating > 0 ? "Poor" : "New";

      const statusMap: Record<string, "On Duty" | "Sick Leave" | "Half-Day Leave"> = {
        ACTIVE: "On Duty",
        SUSPENDED: "Sick Leave",
        PENDING: "Half-Day Leave",
      };

      return {
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        email: d.email,
        phone: d.phone ?? "",
        address: [d.city, d.country].filter(Boolean).join(", "),
        status: statusMap[d.status] ?? "Half-Day Leave",
        dbStatus: d.status,
        isOnline: d.isOnline,
        workHours: completedBookings.length * 2,
        performance: avgRating,
        perfLabel,
        vehicle: d.vehicle ? { make: d.vehicle.make, model: d.vehicle.model, tier: d.vehicle.tier, plate: d.vehicle.plate } : null,
        recentBookings: d.bookings.slice(0, 8).map(b => ({
          id: b.id, status: b.status,
          date: new Date(b.createdAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }),
          time: new Date(b.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          client: b.clientName,
          car:    b.carName,
          createdAt: b.createdAt,
        })),
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, city, country, status } = body;
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const { randomBytes, createHash } = await import("crypto");
    const tempPass = randomBytes(10).toString("hex");
    const hashed = createHash("sha256").update(tempPass).digest("hex");

    const dbStatus = status === "On Duty" ? "ACTIVE" : status === "Sick Leave" ? "SUSPENDED" : "PENDING";

    const driver = await prisma.driver.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        password: hashed,
        city: city ?? "",
        country: country ?? "",
        status: dbStatus as never,
      },
    });

    return NextResponse.json({ id: driver.id, tempPassword: tempPass }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create driver" }, { status: 500 });
  }
}
