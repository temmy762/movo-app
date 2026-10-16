/**
 * Re-send a completed booking's receipt email to the customer (e.g. if the
 * original didn't arrive). Reads the booking from the database; changes nothing.
 *
 *   Preview (prints who/what, sends nothing):
 *     node --env-file=.env.production scripts/resend-receipt.cjs MOVO-B-000001
 *   Send:
 *     node --env-file=.env.production scripts/resend-receipt.cjs MOVO-B-000001 --send
 */
const path = require("path");
const { createJiti } = require("jiti");
const { Client } = require("pg");
const { Resend } = require("resend");

const root = path.join(__dirname, "..");
const jiti = createJiti(__filename, { alias: { "@": root }, jsx: { runtime: "automatic" }, interopDefault: true });

const ref = process.argv[2];
const send = process.argv.includes("--send");
if (!ref || !/^MOVO-B-\d{6}$/.test(ref)) {
  console.error("Usage: node --env-file=.env.production scripts/resend-receipt.cjs MOVO-B-000001 [--send]");
  process.exit(1);
}

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const b = (await db.query(
    `SELECT b.*, u.email AS "userEmail", u."firstName" AS "userFirstName", u."lastName" AS "userLastName"
       FROM "Booking" b LEFT JOIN "User" u ON u.id = b."userId" WHERE b."bookingNumber" = $1`, [ref],
  )).rows[0];
  await db.end();

  if (!b) { console.error(`No booking ${ref}`); process.exit(1); }
  if (b.paymentStatus !== "PAID") { console.error(`${ref} is ${b.paymentStatus}, not PAID — no receipt to send`); process.exit(1); }
  if (!b.userEmail) { console.error(`${ref} has no customer email`); process.exit(1); }

  const isCare = b.bookingType === "CARE";
  const { serviceLabel } = await jiti.import(path.join(root, "lib/tierLabels.ts"));
  const items = isCare
    ? [
        { label: "Safe Ride fare", amount: b.fare },
        ...(b.waitingFee ? [{ label: "Waiting time", amount: b.waitingFee }] : []),
        ...(b.gst ? [{ label: "GST", amount: b.gst }] : []),
      ]
    : [
        { label: "Ride Fare", amount: b.fare },
        ...(b.additionalStopFee ? [{ label: "Additional Stops", amount: b.additionalStopFee }] : []),
        ...(b.airportFee ? [{ label: "Airport Pickup Fee", amount: b.airportFee }] : []),
        ...(b.waitingFee ? [{ label: "Waiting Time", amount: b.waitingFee }] : []),
        ...(b.serviceFee ? [{ label: "Service Fee", amount: b.serviceFee }] : []),
        ...(b.gst ? [{ label: "GST", amount: b.gst }] : []),
      ];
  const when = b.completedAt ?? b.createdAt;
  const data = {
    bookingId: b.id,
    paymentId: b.stripePaymentIntentId ?? b.id,
    receiptNumber: b.receiptNumber,
    bookingNumber: b.bookingNumber,
    serviceLabel: isCare ? "Safe Ride" : serviceLabel(b.carTier, b.bookingType),
    amount: b.total,
    method: "Card",
    date: new Date(when).toLocaleDateString("en-CA", { timeZone: "America/Winnipeg", year: "numeric", month: "long", day: "numeric" }),
    items,
  };
  const settings = {
    appName: process.env.NEXT_PUBLIC_APP_NAME || "MOVO",
    supportEmail: process.env.SUPPORT_EMAIL || "support@movoprive.com",
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://movoprive.com",
    logoUrl: "https://movoprive.com/images/logo/email-logo-static.png",
  };
  const { riderPaymentReceiptTemplate } = await jiti.import(path.join(root, "lib/notifications/templates/emails/rider/payment-receipt.tsx"));
  const t = riderPaymentReceiptTemplate({
    recipient: { type: "user", id: b.userId, firstName: b.userFirstName || "there", lastName: b.userLastName, email: b.userEmail },
    data, settings,
  });

  console.log(`Receipt ${b.receiptNumber} for ${ref} — $${b.total.toFixed(2)} → ${b.userEmail}`);
  if (!send) { console.log("Preview only — add --send to email it."); return; }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `${process.env.FROM_NAME || "MOVO"} <${process.env.FROM_EMAIL || "noreply@movoprive.com"}>`;
  const { data: res, error } = await resend.emails.send({ from, to: b.userEmail, subject: t.subject, html: await t.html, text: t.text });
  if (error) { console.error("Resend refused it:", error); process.exit(1); }
  console.log("Sent — Resend id:", res?.id);
})().catch((e) => { console.error(e); process.exit(1); });
