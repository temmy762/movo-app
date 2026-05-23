import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const phone = "+15550000001";
  const password = "Admin@movo2026";

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    console.log("Admin already exists — skipping.");
    await prisma.$disconnect();
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "MOVO",
      phone,
      password: hashed,
      role: "ADMIN",
    },
  });

  console.log("✓ Admin user created");
  console.log("  Phone:    ", phone);
  console.log("  Password: ", password);
  console.log("  → Change this password after first login.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
