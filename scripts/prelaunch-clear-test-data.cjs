/**
 * Pre-launch cleanup: deletes TEST ACTIVITY, keeps every account and setting.
 *
 *   Dry run (shows what would be deleted, changes nothing):
 *     node --env-file=.env.local scripts/prelaunch-clear-test-data.cjs
 *   Do it:
 *     node --env-file=.env.local scripts/prelaunch-clear-test-data.cjs --confirm
 *   (on the VPS use --env-file=.env.production)
 *
 * Deletes: bookings, Safe Ride assignments, GPS points, chat messages, wallet
 * entries (chauffeur earnings reset to $0), notifications, audit log, support
 * tickets, incidents, complaints, lost & found, rental records.
 * Resets booking/receipt numbers so the first real ones are MOVO-B-000001 /
 * MOVO-R-000001, and sets every chauffeur offline.
 * Keeps: admins, customers, chauffeurs, onboarding + documents, vehicles,
 * consent records, sessions, pricing / Safe Ride / tier settings.
 *
 * One transaction: a backup of every deleted row is written to backups/ and
 * verified BEFORE anything is deleted; any error rolls everything back.
 */
const path = require("path");
const fs = require("fs");
const { Client } = require("pg");

/* Children before parents (FK RESTRICT on Booking / Notification / RentalVehicle) */
const WIPE = [
  "AdminNotification", "Notification",
  "TripLocation", "BookingMessage", "CareAssignment",
  "Complaint", "IncidentReport", "LostFoundItem", "SupportTicket",
  "WalletTransaction", "AuditLog", "VehicleRental",
  "Booking",
];

const confirm = process.argv.includes("--confirm");

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — run with --env-file=.env.local (or .env.production on the VPS)");
    process.exit(1);
  }
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log("Database:", (process.env.DATABASE_URL.match(/@([^/:]+)/) || [])[1]);

  if (!confirm) {
    for (const t of WIPE) {
      const n = (await c.query(`SELECT count(*)::int AS n FROM "${t}"`)).rows[0].n;
      console.log(`would delete ${String(n).padStart(5)} ${t}`);
    }
    console.log("\nDry run — nothing changed. Add --confirm to back up and delete.");
    await c.end();
    return;
  }

  await c.query("BEGIN");
  try {
    /* 1. Backup, verified before deleting */
    const backup = { createdAt: new Date().toISOString(), tables: {} };
    for (const t of WIPE) backup.tables[t] = (await c.query(`SELECT * FROM "${t}"`)).rows;
    backup.sequences = {
      booking_number_seq: (await c.query("SELECT last_value FROM booking_number_seq")).rows[0].last_value,
      receipt_number_seq: (await c.query("SELECT last_value FROM receipt_number_seq")).rows[0].last_value,
    };
    const dir = path.join(__dirname, "..", "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `pre-launch-test-data-${backup.createdAt.replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify(backup));
    const check = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const t of WIPE) {
      if (check.tables[t].length !== backup.tables[t].length) throw new Error(`backup check failed for ${t}`);
    }
    console.log(`Backup saved: ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);

    /* 2. Delete test activity */
    for (const t of WIPE) {
      const r = await c.query(`DELETE FROM "${t}"`);
      console.log(`deleted ${String(r.rowCount).padStart(5)} ${t}`);
    }

    /* 3. First real booking / receipt = 000001 */
    await c.query("SELECT setval('booking_number_seq', 1, false)");
    await c.query("SELECT setval('receipt_number_seq', 1, false)");

    /* 4. Nobody left "online" from testing */
    const off = await c.query(`UPDATE "Driver" SET "isOnline" = false WHERE "isOnline" = true`);
    console.log(`set offline: ${off.rowCount} chauffeur(s)`);

    await c.query("COMMIT");
    console.log("\nDone — test activity cleared. Accounts and settings kept.");
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("\nROLLED BACK — nothing was deleted:", e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
