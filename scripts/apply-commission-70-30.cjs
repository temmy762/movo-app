/**
 * Movo commission = 30% on every tier (chauffeur keeps 70% of the fare,
 * GST excluded), and independent chauffeurs keep 100% of that 70%.
 *
 *   Dry run (shows the changes, changes nothing):
 *     node --env-file=.env.production scripts/apply-commission-70-30.cjs
 *   Apply:
 *     node --env-file=.env.production scripts/apply-commission-70-30.cjs --confirm
 *
 * 1. Sets the commission to 30% on the Standard / Executive / Concierge tiers.
 * 2. Back-pays independent chauffeurs (no fleet owner) for past In-City rides
 *    where the old 85% "fleet split" was deducted: a one-off EARNING
 *    correction per ride, so each ride ends up at exactly 70% of its fare.
 *    Safe Ride rides were never affected (they use the locked 70% payout).
 * Idempotent: corrections are tagged and never added twice.
 */
const { Client } = require("pg");

const confirm = process.argv.includes("--confirm");
const TARGET = 0.30;
const r2 = (n) => Math.round(n * 100) / 100;

(async () => {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set — use --env-file=.env.production"); process.exit(1); }
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query("BEGIN");
  try {
    /* 1. Tier commission */
    const tiers = (await c.query(`SELECT tier, "commissionRate" FROM "VehicleTierConfig" WHERE tier IN ('classic','premium','black') ORDER BY tier`)).rows;
    for (const t of tiers) {
      const current = t.commissionRate > 1 ? t.commissionRate / 100 : t.commissionRate;
      console.log(`commission ${t.tier.padEnd(8)} ${(current * 100).toFixed(0)}% → 30%${Math.abs(current - TARGET) < 1e-9 ? " (already)" : ""}`);
    }
    await c.query(`UPDATE "VehicleTierConfig" SET "commissionRate" = $1 WHERE tier IN ('classic','premium','black')`, [TARGET]);

    /* 2. Back-pay independent chauffeurs for the 85% split */
    const rides = (await c.query(`
      SELECT b.id, b."bookingNumber", b.fare, b."driverId", d."firstName", d."lastName",
             COALESCE((SELECT SUM(w.amount) FROM "WalletTransaction" w
                        WHERE w."driverId" = b."driverId" AND w.type = 'EARNING' AND w.note LIKE '%' || b.id || '%'), 0) AS credited
        FROM "Booking" b JOIN "Driver" d ON d.id = b."driverId"
       WHERE b.status = 'COMPLETED' AND b."bookingType" <> 'CARE' AND d."fleetOwnerId" IS NULL AND b.fare > 0`)).rows;
    let total = 0;
    for (const r of rides) {
      const owed = r2(r.fare * (1 - TARGET));
      const diff = r2(owed - Number(r.credited));
      if (diff <= 0.009) continue;
      const tag = `[split-correction:${r.id}]`;
      const done = (await c.query(`SELECT 1 FROM "WalletTransaction" WHERE note LIKE $1 LIMIT 1`, [`%${tag}%`])).rowCount;
      if (done) continue;
      console.log(`back-pay ${r.firstName} ${r.lastName}: ${r.bookingNumber ?? r.id} — credited $${Number(r.credited).toFixed(2)}, owed $${owed.toFixed(2)} → +$${diff.toFixed(2)}`);
      await c.query(
        `INSERT INTO "WalletTransaction" (id, "driverId", type, status, amount, note, "createdAt", "updatedAt")
         VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), $1, 'EARNING', 'COMPLETED', $2, $3, now(), now())`,
        [r.driverId, diff, `Earnings adjustment (full 70%) — booking ${r.id} ${tag}`],
      );
      total += diff;
    }
    console.log(`back-pay total: $${r2(total).toFixed(2)}`);

    if (confirm) { await c.query("COMMIT"); console.log("\nApplied."); }
    else { await c.query("ROLLBACK"); console.log("\nDry run — nothing changed. Add --confirm to apply."); }
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("Rolled back — nothing changed:", e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
