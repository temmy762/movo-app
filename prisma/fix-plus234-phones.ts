/**
 * One-time script: correct Canadian phone numbers that were saved as Nigerian.
 *
 * The phone normaliser used to add +234 to any 10-digit number typed without a
 * country code, so "204 555 0123" was stored as "+2342045550123". This finds
 * +234 numbers whose 10-digit national part starts with a Canadian area code
 * and rewrites them as +1.
 *
 * Area codes that are ALSO Nigerian mobile prefixes (705, 709, 807, 902, 905)
 * are ambiguous — they're listed for manual review, never changed.
 *
 * Dry run (default — prints what would change):
 *   npx ts-node --project tsconfig.seed.json prisma/fix-plus234-phones.ts
 * Apply:
 *   npx ts-node --project tsconfig.seed.json prisma/fix-plus234-phones.ts --apply
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const APPLY = process.argv.includes("--apply");

const CANADIAN_AREA_CODES = new Set([
  "204", "226", "236", "249", "250", "257", "263", "289", "306", "343", "354", "365", "367", "368",
  "382", "387", "403", "416", "418", "428", "431", "437", "438", "450", "460", "468", "474", "506",
  "514", "519", "548", "579", "581", "584", "587", "600", "604", "613", "622", "639", "647", "672",
  "683", "705", "709", "742", "753", "778", "780", "782", "807", "819", "825", "867", "873", "879",
  "902", "905", "942",
]);
/* Also valid Nigerian mobile prefixes — can't tell which country was meant */
const AMBIGUOUS = new Set(["705", "709", "807", "819", "902", "905"]);

type Verdict = { fix: string } | { review: true } | null;

function verdict(phone: string | null): Verdict {
  if (!phone) return null;
  const m = phone.match(/^\+234(\d{10})$/);
  if (!m) return null;
  const area = m[1].slice(0, 3);
  if (!CANADIAN_AREA_CODES.has(area)) return null;
  if (AMBIGUOUS.has(area)) return { review: true };
  return { fix: `+1${m[1]}` };
}

async function fix<T extends { id: string }>(
  label: string,
  rows: T[],
  get: (r: T) => string | null,
  save: (id: string, phone: string) => Promise<unknown>,
) {
  let fixed = 0;
  for (const r of rows) {
    const phone = get(r);
    const v = verdict(phone);
    if (!v) continue;
    if ("review" in v) {
      console.log(`  REVIEW  ${label} ${r.id}  ${phone}  (area code is also a Nigerian prefix)`);
      continue;
    }
    console.log(`  ${APPLY ? "FIXED " : "WOULD FIX"} ${label} ${r.id}  ${phone} → ${v.fix}`);
    if (APPLY) {
      try { await save(r.id, v.fix); fixed++; }
      catch (e) { console.log(`  SKIPPED ${label} ${r.id}: ${(e as Error).message}`); }
    } else fixed++;
  }
  console.log(`${label}: ${fixed} ${APPLY ? "fixed" : "to fix"}`);
}

async function main() {
  console.log(APPLY ? "Applying fixes…" : "Dry run — nothing will be changed. Add --apply to save.");

  const users = await prisma.user.findMany({ where: { phone: { startsWith: "+234" } }, select: { id: true, phone: true } });
  await fix("User", users, r => r.phone, (id, phone) => prisma.user.update({ where: { id }, data: { phone } }));

  const drivers = await prisma.driver.findMany({ where: { phone: { startsWith: "+234" } }, select: { id: true, phone: true } });
  await fix("Driver", drivers, r => r.phone, (id, phone) => prisma.driver.update({ where: { id }, data: { phone } }));
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
