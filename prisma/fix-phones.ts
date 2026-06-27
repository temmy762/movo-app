/**
 * One-time script: normalize all existing phone numbers to E.164.
 *
 * Run with:
 *   npx ts-node --project tsconfig.seed.json prisma/fix-phones.ts
 *
 * Safe to run multiple times — already-E.164 numbers are unchanged.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function toE164(phone: string, defaultCountryCode = "1"): string {
  let digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return `+${digits}`;
  if (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }
  if (digits.length === 11 && digits.startsWith(defaultCountryCode)) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  return `+${digits}`;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function fixTable(
  model: "user" | "driver",
  phoneField: string
): Promise<{ total: number; fixed: number; skipped: number }> {
  const records = await (prisma[model] as any).findMany({
    where: { [phoneField]: { not: null } },
    select: { id: true, [phoneField]: true },
  });

  let fixed = 0;
  let skipped = 0;

  for (const r of records) {
    const raw = r[phoneField];
    if (!raw) continue;
    const normalized = toE164(raw);
    if (normalized === raw) {
      skipped++;
      continue;
    }
    await (prisma[model] as any).update({
      where: { id: r.id },
      data: { [phoneField]: normalized },
    });
    fixed++;
    console.log(`  [${model}] ${r.id}: ${raw} → ${normalized}`);
  }

  return { total: records.length, fixed, skipped };
}

async function main() {
  console.log("=== Phone Normalization Migration ===\n");

  console.log("Users:");
  const u = await fixTable("user", "phone");
  console.log(`  Total: ${u.total}, Fixed: ${u.fixed}, Already OK: ${u.skipped}\n`);

  console.log("Drivers:");
  const d = await fixTable("driver", "phone");
  console.log(`  Total: ${d.total}, Fixed: ${d.fixed}, Already OK: ${d.skipped}\n`);

  console.log("Driver Onboarding (firstChauffeurPhone):");
  const onboardings = await prisma.driverOnboarding.findMany({
    where: { firstChauffeurPhone: { not: null } },
    select: { id: true, firstChauffeurPhone: true },
  });
  let obFixed = 0;
  for (const ob of onboardings) {
    if (!ob.firstChauffeurPhone) continue;
    const normalized = toE164(ob.firstChauffeurPhone);
    if (normalized === ob.firstChauffeurPhone) continue;
    await prisma.driverOnboarding.update({
      where: { id: ob.id },
      data: { firstChauffeurPhone: normalized },
    });
    obFixed++;
    console.log(`  [onboarding] ${ob.id}: ${ob.firstChauffeurPhone} → ${normalized}`);
  }
  console.log(`  Total: ${onboardings.length}, Fixed: ${obFixed}\n`);

  console.log("=== Done ===");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
