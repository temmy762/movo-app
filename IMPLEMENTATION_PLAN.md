# MOVO Payment Ecosystem — Implementation Plan
> Generated: June 2026 | Follows PAYMENT_AUDIT_REPORT.md

---

## PRIORITY 1 — Critical Before Launch

These items either break core user flows, expose security vulnerabilities, or make revenue tracking impossible.

---

### P1-1 · Fix Payment Race Condition
**Problem:** Card is charged before booking record exists. Failed booking POST = money taken, no ride.  
**Fix:** Reverse the order — create booking first (`status: PENDING`, `paymentStatus: UNPAID`), return `bookingId` + `clientSecret` together, then confirm payment client-side. Webhook marks it PAID.  
**Files:**
- `app/home/ride/confirm/page.tsx` — create booking before Stripe `confirmPayment()`
- `app/api/bookings/route.ts` — accept `stripePaymentIntentId` at creation (optional)
- `app/api/stripe/create-payment-intent/route.ts` — attach `metadata.bookingId`

---

### P1-2 · Fix Cancellation Guard for Started Trips
**Problem:** Cancelling a trip with `startedAt` set triggers a full Stripe refund incorrectly.  
**Fix:** In the cancel branch of `app/api/bookings/[id]/status/route.ts`, check `existing.startedAt`. If set, block cancellation or skip refund.  
**Files:**
- `app/api/bookings/[id]/status/route.ts`

---

### P1-3 · Prevent Double Refund
**Problem:** Re-calling CANCELLED on an already-CANCELLED booking fires Stripe refund again.  
**Fix:** Check `existing.status === "CANCELLED"` before processing. Store Stripe `refund.id` in a new `Booking.refundId` field.  
**Schema change:** Add `refundId String?` and `cancelledAt DateTime?` and `cancelledBy String?` to `Booking`.  
**Files:**
- `prisma/schema.prisma`
- `app/api/bookings/[id]/status/route.ts`

---

### P1-4 · Fix Admin Financial Payments POST — Security + Data Integrity
**Problem:** No auth check. Creates bookings with `carTier: "STANDARD"` and `pickup: "N/A"`, corrupting real data.  
**Fix:** Add `getSession()` + admin role check. Separate "invoice" concept from real bookings using a flag or a dedicated `Invoice` model, OR simply stop writing to Booking from the admin payments page and display a read-only view instead.  
**Files:**
- `app/api/admin/financials/payments/route.ts`

---

### P1-5 · Add Payout Balance Check
**Problem:** Driver can request a payout larger than their available balance.  
**Fix:** In the payout route, compute `availableBalance` before creating the transaction and reject if `amount > availableBalance`.  
**Files:**
- `app/api/driver/wallet/payout/route.ts`

---

### P1-6 · Auto-Credit Driver Earnings on Trip Completion
**Problem:** When a driver ends a ride, no `WalletTransaction` is created. Earnings come from a raw booking query only — no ledger.  
**Fix:** When `PATCH /api/bookings/[id]/status` sets status to `COMPLETED`, create a `WalletTransaction(type: PAYOUT... wait — type should be EARNING)`.  
**Schema change:** Add `EARNING` to `WalletTxType` enum in `prisma/schema.prisma`.  
**Fix in:** `app/api/bookings/[id]/status/route.ts` — on `status === "COMPLETED"`, create `WalletTransaction { type: "EARNING", status: "COMPLETED", amount: booking.fare, note: "Trip earning" }`.  
**Files:**
- `prisma/schema.prisma` — add `EARNING` to `WalletTxType`
- `app/api/bookings/[id]/status/route.ts`
- `app/api/driver/wallet/route.ts` — update balance calculation to include EARNING type

---

### P1-7 · Fix Ride Completed Page — Connect to Real Data
**Problem:** Distance, duration, amount, driver name are all hardcoded mocks. Rating is never submitted.  
**Fix:** Read `bookingId` from URL params. Fetch booking data. Submit rating to `/api/bookings/[id]/rating`.  
**Files:**
- `app/home/ride/completed/page.tsx`

---

### P1-8 · Add Admin Payout Approval Interface
**Problem:** Driver payout requests sit as PENDING forever. No admin can approve or reject them.  
**Fix:** Add a "Payout Requests" section to the admin financial area showing all `WalletTransaction(type: PAYOUT, status: PENDING)` with Approve/Reject buttons. Approving marks the transaction COMPLETED and deducts balance. Rejecting marks it FAILED.  
**New files:**
- `app/admin/(panel)/financials/payouts/page.tsx`
- `app/api/admin/financials/payouts/route.ts` — GET pending, PATCH approve/reject

---

### P1-9 · Add Dynamic Fare Calculation
**Problem:** Every booking charges exactly $35.50 regardless of route.  
**Fix:** On the available-cars page (after route is known), call Google Distance Matrix to get distance/duration, apply a per-tier rate card from `VehicleTierConfig`. Return estimated fare before booking is confirmed.  
**Config:** `VehicleTierConfig` already exists in schema with a `price` field (use as base rate per km).  
**Files:**
- `app/api/bookings/estimate/route.ts` — new: calculates fare from pickup/dropoff/tier
- `app/home/ride/confirm/page.tsx` — fetch estimate and use dynamic amounts
- `app/home/pickup/available-cars/page.tsx` — show estimated fare per car

---

## PRIORITY 2 — Important

These items are needed for a complete product but do not block the core booking flow.

---

### P2-1 · Driver Bank Account Management Page
**Problem:** Bank account is captured during onboarding but cannot be viewed or updated afterward.  
**Fix:** Add a "Banking" section to the driver profile. Allow viewing masked account details and updating via a new API.  
**New files:**
- `app/driver/home/profile/banking/page.tsx`
- `app/api/driver/profile/banking/route.ts` — GET (masked) and PATCH

---

### P2-2 · Stripe Webhook — Handle Failed & Disputed Payments
**Problem:** Failed payments and disputes are silently ignored.  
**Fix:** Add handlers in `app/api/stripe/webhook/route.ts`:
- `payment_intent.payment_failed` → set `paymentStatus: "FAILED"`, cancel booking
- `charge.dispute.created` → flag booking, notify admin
- `charge.refunded` → set `paymentStatus: "REFUNDED"` if not already set

---

### P2-3 · Partial Refund Support
**Problem:** Only full refunds are possible.  
**Fix:** Admin can specify a custom refund amount. Pass `amount` to `stripe.refunds.create({ amount: cents })`.  
**Files:**
- `app/api/bookings/[id]/status/route.ts` — accept optional `refundAmount`
- `app/admin/(panel)/bookings/page.tsx` — add amount input on Refund button

---

### P2-4 · Refund History View for Admin
**Problem:** No way to see all refunds that have been issued.  
**Fix:** Query bookings where `paymentStatus: "REFUNDED"`, add a "Refunds" tab or filter in the bookings page.  
**Files:**
- `app/admin/(panel)/bookings/page.tsx` — add Refunded filter tab

---

### P2-5 · Driver Photo Upload — Connect to Server
**Problem:** Photo upload creates a local blob URL that disappears on refresh.  
**Fix:** Upload to a storage service (Cloudinary / S3 presigned URL) and save the URL to the `Driver` record.  
**New files:**
- `app/api/driver/profile/photo/route.ts`
**Schema change:** Add `photoUrl String?` to `Driver` model

---

### P2-6 · Cancellation Policy Rules
**Problem:** No time-based cancellation rules.  
**Fix:** 
- Free cancellation if driver not yet assigned (`driverId === null`)
- Free cancellation within 5 minutes of booking (`createdAt + 5min`)
- Partial refund (e.g., 50%) if cancelled after 5 min with driver assigned
- No refund if cancelled after `startedAt`
**Files:**
- `app/api/bookings/[id]/status/route.ts` — add policy logic
- `app/home/ride/tracking/page.tsx` — show cancellation fee warning in confirmation dialog

---

### P2-7 · Fleet Partner Earnings Split
**Problem:** No separate earnings for fleet owners.  
**Fix:** Identify if the driver is part of a fleet (via `onboarding.type === "FLEET"`). Split the fare: driver gets X%, fleet owner gets Y%.  
**Schema change:** Consider adding `fleetOwnerId String?` to `Driver` for fleet membership tracking.

---

### P2-8 · Platform Commission Configuration
**Problem:** No explicit commission rate.  
**Fix:** Add `commissionRate Float @default(0.20)` to `VehicleTierConfig` or a new `PlatformConfig` model. Apply during trip completion to calculate `driverEarning = fare * (1 - commissionRate)`.  
**Files:**
- `prisma/schema.prisma`
- `app/api/bookings/[id]/status/route.ts`

---

## PRIORITY 3 — Future Enhancements

These are valuable but can be built after launch.

---

### P3-1 · Stripe Connect — Real Bank Payouts
Replace the manual payout approval flow with automated Stripe Connect transfers. Each driver would have a Stripe Connect account. Admin approving a payout triggers `stripe.transfers.create()`.

### P3-2 · Driver Pending vs. Available Earnings
Split wallet balance into "Pending" (trip completed, not yet settled) and "Available" (settled after X days). This requires a settlement delay concept.

### P3-3 · Idempotency Keys on Payment Intent
Pass `idempotency_key` to Stripe to prevent duplicate charges on network retries.

### P3-4 · Payment Receipt Email
When `paymentStatus` becomes `PAID`, fire `RIDER_PAYMENT_RECEIPT` notification. The event type already exists in the schema but has no template or trigger.

### P3-5 · Admin Earnings Analytics
A dedicated earnings dashboard showing:
- Gross revenue per month
- Platform commission earned
- Driver payouts issued
- Outstanding payout requests
- Refunds issued

### P3-6 · Driver Topup via Stripe
If drivers need to top up their wallet (e.g., for bonding/deposits), implement a real Stripe checkout for the topup flow.

### P3-7 · Booking Insurance / Surge Pricing
Tier-based surge multiplier during peak hours. Requires fare calculation infrastructure from P1-9.

---

## Summary Table

| ID | Item | Priority | Effort | Blocks |
|---|---|---|---|---|
| P1-1 | Fix payment race condition | 🔴 P1 | Medium | Core booking |
| P1-2 | Guard cancellation of started trips | 🔴 P1 | Small | Refund integrity |
| P1-3 | Prevent double refund | 🔴 P1 | Small | Money integrity |
| P1-4 | Fix admin payments POST security | 🔴 P1 | Small | Data integrity |
| P1-5 | Add payout balance check | 🔴 P1 | Small | Wallet integrity |
| P1-6 | Auto-credit driver earnings | 🔴 P1 | Small | Driver pay |
| P1-7 | Fix ride completed page | 🔴 P1 | Medium | UX + ratings |
| P1-8 | Admin payout approval UI | 🔴 P1 | Medium | Driver pay |
| P1-9 | Dynamic fare calculation | 🔴 P1 | Large | Revenue accuracy |
| P2-1 | Bank account management page | 🟡 P2 | Medium | — |
| P2-2 | Webhook: failed/disputed payments | 🟡 P2 | Small | — |
| P2-3 | Partial refund | 🟡 P2 | Small | — |
| P2-4 | Refund history view | 🟡 P2 | Small | — |
| P2-5 | Driver photo server upload | 🟡 P2 | Medium | — |
| P2-6 | Cancellation policy rules | 🟡 P2 | Medium | — |
| P2-7 | Fleet partner earnings split | 🟡 P2 | Large | — |
| P2-8 | Platform commission config | 🟡 P2 | Small | — |
| P3-1 | Stripe Connect payouts | 🟢 P3 | Large | — |
| P3-2 | Pending vs available earnings | 🟢 P3 | Medium | — |
| P3-3 | Idempotency keys | 🟢 P3 | Small | — |
| P3-4 | Payment receipt email | 🟢 P3 | Small | — |
| P3-5 | Admin earnings analytics | 🟢 P3 | Large | — |

---

> **Next Step:** Reply with approval to begin implementing Priority 1 items in sequence, starting with P1-1 (payment race condition fix).
