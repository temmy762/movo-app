/**
 * Send sample MOVO emails to your own inboxes to check them in Gmail,
 * Apple Mail and Outlook (logo, layout, dark mode).
 *
 *   node --env-file=.env.production scripts/send-test-emails.cjs you@gmail.com you@icloud.com you@outlook.com
 *
 * Sends: Welcome (flipping logo), Booking confirmed and Payment receipt
 * (static logo), filled with sample data. Nothing is written to the database.
 */
const path = require("path");
const { createJiti } = require("jiti");
const { Resend } = require("resend");

const root = path.join(__dirname, "..");
const jiti = createJiti(__filename, { alias: { "@": root }, jsx: { runtime: "automatic" }, interopDefault: true });

const recipients = process.argv.slice(2).filter((a) => a.includes("@"));
if (!recipients.length) {
  console.error("Usage: node --env-file=.env.production scripts/send-test-emails.cjs you@example.com [more@example.com]");
  process.exit(1);
}
if (!process.env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set — run with --env-file=.env.production");
  process.exit(1);
}

(async () => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `${process.env.FROM_NAME || "MOVO"} <${process.env.FROM_EMAIL || "noreply@movoprive.com"}>`;
  const settings = {
    appName: "MOVO",
    supportEmail: process.env.SUPPORT_EMAIL || "support@movoprive.com",
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://movoprive.com",
    logoUrl: "https://movoprive.com/images/logo/email-logo-static.png",
    animatedLogoUrl: "https://movoprive.com/images/logo/email-logo-flip.gif",
  };
  const data = {
    bookingId: "sample", bookingNumber: "MOVO-B-000123", receiptNumber: "MOVO-R-000045",
    pickup: "123 Portage Ave, Winnipeg, MB", dropoff: "456 Main St, Winnipeg, MB",
    carTier: "classic", serviceLabel: "In-City · Standard",
    fare: 20, gst: 1.2, total: 24.5, amount: 24.5, scheduledDate: "Tue, Oct 14, 5:00 PM",
  };
  const templates = [
    ["lib/notifications/templates/emails/rider/welcome.tsx", "riderWelcomeTemplate"],
    ["lib/notifications/templates/emails/rider/booking-confirmed.tsx", "riderBookingConfirmedTemplate"],
    ["lib/notifications/templates/emails/rider/payment-receipt.tsx", "riderPaymentReceiptTemplate"],
  ];

  for (const to of recipients) {
    const recipient = { type: "user", id: "sample", firstName: "Test", lastName: "Rider", email: to };
    for (const [file, fn] of templates) {
      const mod = await jiti.import(path.join(root, file));
      const t = mod[fn]({ recipient, data, settings });
      const { error } = await resend.emails.send({ from, to, subject: `[TEST] ${t.subject}`, html: await t.html, text: t.text });
      console.log(error ? `✗ ${to} — ${t.subject}: ${error.message}` : `✓ ${to} — ${t.subject}`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
