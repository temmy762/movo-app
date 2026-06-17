/**
 * Run on the VPS to create or reset the admin account.
 * Usage: npx ts-node scripts/reset-admin.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const PHONE    = "+15550000001";
const PASSWORD = "Admin@movo2026";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma  = new PrismaClient({ adapter } as never);

  const hashed = await bcrypt.hash(PASSWORD, 12);

  const existing = await prisma.user.findUnique({ where: { phone: PHONE } });

  if (existing) {
    if (existing.role !== "ADMIN") {
      console.error(`User with phone ${PHONE} exists but role is ${existing.role} — aborting.`);
      process.exit(1);
    }
    await prisma.user.update({
      where: { phone: PHONE },
      data: { password: hashed },
    });
    console.log("✓ Admin password reset successfully.");
  } else {
    await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName:  "MOVO",
        phone:     PHONE,
        password:  hashed,
        role:      "ADMIN",
      },
    });
    console.log("✓ Admin user created.");
  }

  console.log("  Phone:    ", PHONE);
  console.log("  Password: ", PASSWORD);
  console.log("  URL:       https://movoprive.com/admin/login");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
