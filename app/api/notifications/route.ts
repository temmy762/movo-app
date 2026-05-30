import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/notifications
 * Get notifications for the current user with pagination
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Determine user type from session
    const isDriver = session.role === "DRIVER";
    const userId = isDriver ? session.driverId : session.userId;

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const whereClause = isDriver ? { driverId: userId } : { userId };

    const where = {
      ...whereClause,
      type: "IN_APP",
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          eventType: true,
          title: true,
          message: true,
          data: true,
          readAt: true,
          createdAt: true,
          bookingId: true,
          incidentId: true,
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { ...whereClause, type: "IN_APP", readAt: null },
      }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("[Notifications] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/mark-read
 * Mark notifications as read (body: { notificationId?: string, all?: boolean })
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, all } = body;

    // Determine user type from session
    const isDriver = session.role === "DRIVER";
    const userId = isDriver ? session.driverId : session.userId;

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const whereClause = isDriver ? { driverId: userId } : { userId };

    if (all) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          ...whereClause,
          type: "IN_APP",
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      return NextResponse.json({ success: true, markedAll: true });
    }

    if (notificationId) {
      // Mark specific notification as read
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          ...whereClause,
          type: "IN_APP",
        },
        data: { readAt: new Date() },
      });

      return NextResponse.json({ success: true, notificationId });
    }

    return NextResponse.json(
      { error: "Must provide notificationId or all: true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Notifications] POST error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
