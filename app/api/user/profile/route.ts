import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, buildClearCookieHeader } from "@/lib/session";
import { randomBytes } from "crypto";
import Stripe from "stripe";
import { toE164 } from "@/lib/sms";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      title: true,
      company: true,
      street: true,
      postCode: true,
      city: true,
      country: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, title, company, street, postCode, city, country } = body;

    const data: Record<string, string | null> = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email || null;
    if (title !== undefined) data.title = title || null;
    if (company !== undefined) data.company = company || null;
    if (street !== undefined) data.street = street || null;
    if (postCode !== undefined) data.postCode = postCode || null;
    if (city !== undefined) data.city = city || null;
    if (country !== undefined) data.country = country || null;

    /* Normalise phone and skip update if unchanged (avoids false uniqueness errors) */
    if (phone !== undefined) {
      const normalised = phone ? toE164(phone.trim()) : null;
      const current = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { phone: true },
      });
      if (normalised !== current?.phone) {
        data.phone = normalised;
      }
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        title: true,
        company: true,
        street: true,
        postCode: true,
        city: true,
        country: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err: unknown) {
    console.error("[PATCH /api/user/profile] error:", err);
    const prismaErr = err as { code?: string; meta?: Record<string, unknown>; message?: string };
    if (prismaErr?.code === "P2002") {
      /* Prisma 7.x driver adapter doesn't always populate meta.target — fall back to message string */
      const target = (prismaErr.meta?.target as string[] | undefined) ?? [];
      const msg = (prismaErr.message ?? "").toLowerCase();
      if (target.includes("email") || msg.includes("email")) {
        return NextResponse.json({ error: "Email already in use by another account" }, { status: 409 });
      }
      if (target.includes("phone") || msg.includes("phone")) {
        return NextResponse.json({ error: "Phone number already linked to another account" }, { status: 409 });
      }
      return NextResponse.json({ error: "These details are already linked to another account" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

/**
 * DELETE — the customer deletes their own account (required by the App Store
 * and Google Play). Body: { confirm: "DELETE" }.
 * Personal details are erased and sign-in is disabled; ride and payment
 * records are kept (anonymised account) for tax and accounting.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId || session.role !== "USER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== "DELETE") {
      return NextResponse.json({ error: "Please confirm account deletion." }, { status: 400 });
    }

    const active = await prisma.booking.count({
      where: { userId: session.userId, status: { in: ["PENDING", "CONFIRMED"] } },
    });
    if (active) {
      return NextResponse.json(
        { error: "You have an upcoming or active ride. Please complete or cancel it before deleting your account." },
        { status: 409 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { stripeCustomerId: true } });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: {
          firstName: "Deleted", lastName: "User",
          email: null, phone: null, googleId: null,
          title: null, company: null, street: null, postCode: null, city: null, country: null,
          password: randomBytes(32).toString("hex"),
          stripeCustomerId: null,
        },
      }),
      prisma.session.deleteMany({ where: { userId: session.userId } }),
      prisma.deviceToken.deleteMany({ where: { userId: session.userId } }),
      prisma.pushSubscription.deleteMany({ where: { userId: session.userId } }),
    ]);

    /* Saved cards live on the Stripe customer — remove it (payments stay on record in Stripe) */
    if (user?.stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
      await new Stripe(process.env.STRIPE_SECRET_KEY).customers.del(user.stripeCustomerId)
        .catch((e) => console.error("[user-delete] stripe customer", e?.message));
    }

    return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": buildClearCookieHeader() } });
  } catch (e) {
    console.error("[user-delete]", e);
    return NextResponse.json({ error: "Couldn't delete your account. Please contact Movo support." }, { status: 500 });
  }
}
