# MOVO Payment Ecosystem — Audit Report
> Generated: June 2026 | Auditor: Cascade AI

---

## A. WHAT CURRENTLY EXISTS

### Stripe Integration
| Feature | File | Status |
|---|---|---|
| Payment Intent creation | `app/api/stripe/create-payment-intent/route.ts` | ✅ Real |
| Stripe webhook | `app/api/stripe/webhook/route.ts` | ⚠️ Partial |
| Refund on cancellation | `app/api/bookings/[id]/status/route.ts` | ✅ Real (just added) |

**Payment Intent flow:**
- Intent created for a **hardcoded amount** of `$35.50` in `app/home/ride/confirm/page.tsx` (lines 11–13: `FARE=30, SERVICE_FEE=5.50, TOTAL=35.50`)
- Rider pays via Stripe Elements on the confirm page
- On success, booking is POSTed to `/api/bookings` with `paymentStatus: "PAID"`
- Stripe webhook (`payment_intent.succeeded`) also sets booking to `PAID + CONFIRMED` as a secondary confirmation

**Webhook coverage:**
- `payment_intent.succeeded` → ✅ handled
- `payment_intent.payment_failed` → ❌ NOT handled
- `payment_intent.canceled` → ❌ NOT handled
- `charge.dispute.created` → ❌ NOT handled
- `charge.refunded` → ❌ NOT handled

---

### Booking Payments
| Feature | File | Status |
|---|---|---|
| Create booking | `app/api/bookings/route.ts` | ✅ Real |
| Booking status transitions | `app/api/bookings/[id]/status/route.ts` | ✅ Real |
| Start trip | `app/api/bookings/[id]/start/route.ts` | ✅ Real |
| Rating submission | `app/api/bookings/[id]/rating/route.ts` | ✅ API exists |
| Driver location during trip | `app/api/trips/location/route.ts` | ✅ Real |
| Booking GET with driver/vehicle | `app/api/bookings/[id]/route.ts` | ✅ Real |

---

### Cancellation & Refunds
| Scenario | Status Change | Refund |
|---|---|---|
| Customer cancels (any time) | CANCELLED | ✅ Full Stripe refund if PAID |
| Admin cancels | CANCELLED | ✅ Same logic |
| Driver cancels | ❌ No driver-side cancel flow | ❌ N/A |
| Trip already started, then cancelled | CANCELLED | ❌ Would incorrectly refund a started trip |
| Duplicate cancel (already CANCELLED) | Re-fires Stripe refund attempt | ❌ Could double-refund |

---

### Driver Earnings & Wallet
| Feature | File | Status |
|---|---|---|
| Wallet balance GET | `app/api/driver/wallet/route.ts` | ✅ Real (calculates from DB) |
| Payout request | `app/api/driver/wallet/payout/route.ts` | ⚠️ Records `PENDING` tx only |
| Top-up request | `app/api/driver/wallet/topup/route.ts` | ⚠️ Records `PENDING` tx only |
| Wallet UI | `app/driver/home/wallet/page.tsx` | ✅ Connected to real API |
| Earnings auto-credit on trip end | `app/driver/home/page.tsx` `handleEndRide()` | ❌ MISSING |

**Wallet balance formula (current):**
```
availableBalance = sum(COMPLETED bookings fare where PAID) + sum(TOPUP COMPLETED) - sum(PAYOUT COMPLETED)
```
- This reads earnings from `booking.fare` (NOT `booking.total`), excluding platform commission correctly by coincidence
- But **no WalletTransaction is created when a trip completes** — earnings come from a raw booking query only
- No concept of "pending earnings" vs "settled earnings"

---

### Driver Bank Account
| Feature | Storage | Status |
|---|---|---|
| Bank account data | `DriverOnboarding` model fields: `bankAccountName`, `bankInstitution`, `bankAccountNumber`, `bankRoutingNumber` | ⚠️ Captured during onboarding only |
| Dedicated bank management page | None | ❌ MISSING |
| Bank account edit after onboarding | None | ❌ MISSING |
| Bank account used for actual payout | Never | ❌ MISSING |
| Stripe Connect integration | None | ❌ MISSING |

---

### Admin Financial Controls
| Feature | File | Status |
|---|---|---|
| View all bookings/payments | `app/admin/(panel)/bookings/page.tsx` | ✅ Live data |
| Issue refund (manual) | `app/admin/(panel)/bookings/page.tsx` | ✅ Just added |
| View financial overview | `app/admin/(panel)/financials/expenses/page.tsx` | ✅ Live data |
| View/create invoices | `app/admin/(panel)/financials/payments/page.tsx` | ⚠️ Partially real |
| Approve driver payout requests | None | ❌ MISSING |
| View payout request queue | None | ❌ MISSING |
| View refund history | None | ❌ MISSING |
| Partial refund | None | ❌ MISSING |

---

### Database Schema (Payment-related)
| Model | Fields | Notes |
|---|---|---|
| `Booking` | `fare`, `serviceFee`, `total`, `status`, `paymentStatus`, `stripePaymentIntentId`, `driverId` | ✅ Complete |
| `WalletTransaction` | `type (PAYOUT/TOPUP)`, `status`, `amount`, `note`, `driverId` | ⚠️ Missing: `bankAccountSnapshot`, `stripeTransferId`, `adminApprovedBy` |
| `DriverOnboarding` | `bankAccountName`, `bankInstitution`, `bankAccountNumber`, `bankRoutingNumber` | ⚠️ No separate BankAccount model |

**Missing DB fields:**
- `WalletTransaction.adminApprovedAt` — for payout approval audit trail
- `WalletTransaction.adminApprovedBy` — who approved the payout
- `WalletTransaction.stripeTransferId` — for Stripe Connect payouts
- `Booking.cancelledAt` — timestamp when booking was cancelled
- `Booking.cancelledBy` — who cancelled (user/driver/admin)
- `Booking.refundId` — Stripe refund ID for tracking
- `Booking.driverEarning` — explicit driver cut after commission
- `Booking.platformFee` — explicit platform cut

---

## B. WHAT IS INCOMPLETE

### 1. Fare Calculation — HARDCODED
**File:** `app/home/ride/confirm/page.tsx` lines 11–13
```ts
const FARE = 30.00;       // HARDCODED
const SERVICE_FEE = 5.50; // HARDCODED
const TOTAL = 35.50;      // HARDCODED
```
Every ride charges exactly $35.50 regardless of distance, tier, or route. There is no dynamic fare calculation anywhere in the codebase.

### 2. Driver Earnings Not Auto-Created on Trip Completion
**File:** `app/driver/home/page.tsx` `handleEndRide()` (line ~249)
```ts
await patchStatus(activeBooking.id, "COMPLETED");
// ❌ No WalletTransaction created here
```
The driver's balance is derived from a raw query of completed bookings in the wallet API — it works numerically, but there is no earnings ledger entry. If fare changes or commission is deducted later, there is no record of what the driver was owed at the moment of trip completion.

### 3. Payout Is a Database Entry Only — Never Transfers Money
**File:** `app/api/driver/wallet/payout/route.ts`
```ts
await prisma.walletTransaction.create({ data: { type: "PAYOUT", status: "PENDING" } });
// ❌ No Stripe Connect transfer
// ❌ No bank account lookup
// ❌ No admin notification
```
`PENDING` payout transactions are created but **never progress to COMPLETED** because there is no admin approval interface and no Stripe Connect integration.

### 4. Top-Up Does Nothing
**File:** `app/api/driver/wallet/topup/route.ts`
Creates a `PENDING` TOPUP transaction but no payment is collected. There is no Stripe checkout for drivers.

### 5. Platform Commission Not Defined
There is no `COMMISSION_RATE` constant or configuration anywhere. The wallet API uses `booking.fare` (not `total`) for driver earnings, which accidentally excludes the `serviceFee` — but there is no intentional, auditable commission split.

### 6. No Cancellation Policy / Time-Based Rules
- No grace period (e.g., free cancellation within 5 minutes)
- No cancellation fee logic
- No distinction between pre-dispatch and post-dispatch cancellation

### 7. Rating/Review Not Submitted on Ride Completed Page
**File:** `app/home/ride/completed/page.tsx`
```ts
const [rating, setRating] = useState(0);
const [review, setReview]  = useState("");
// ❌ No fetch("/api/bookings/${bookingId}/rating") call anywhere
```
The star rating and review textarea exist in the UI but are never submitted.

### 8. Fleet Partner Earnings Split
No logic exists for fleet partner commission. When a fleet driver completes a ride, the fleet owner gets nothing separately — earnings go entirely to the driver's wallet.

---

## C. WHAT IS BROKEN

### 1. Ride Completed Page — Full Mock
**File:** `app/home/ride/completed/page.tsx`
- Distance: hardcoded `"3.2 mi"`
- Duration: hardcoded `"8 min"`
- Amount: hardcoded `"$35.50"`
- Driver name: hardcoded `"Duice Kersagaard"` (test placeholder)
- Driver photo: static `/images/Ellipse 10.png`
- `bookingId` is not read from URL params — the rating API can never be called

### 2. Payment Race Condition
**File:** `app/home/ride/confirm/page.tsx`
Order of operations:
1. `stripe.confirmPayment()` — charges the card ✅
2. `POST /api/bookings` — creates booking record

If step 2 fails: **money is charged, no booking exists.** The user paid and received nothing. No retry mechanism, no recovery path.

**Fix required:** Create booking first (status: PENDING, paymentStatus: UNPAID), then attach the paymentIntentId, then collect payment.

### 3. Cancellation of Already-Started Trip Would Trigger Refund
**File:** `app/api/bookings/[id]/status/route.ts`
The refund logic fires on any cancellation where `paymentStatus === "PAID"`. If a trip has `startedAt` set and gets cancelled, Stripe will still be asked for a full refund — incorrect for a trip already in progress.

### 4. Double-Refund Possible
If `PATCH /api/bookings/{id}/status` is called with `status: "CANCELLED"` twice (e.g., network retry), the code re-reads the existing booking, sees `paymentStatus === "PAID"` (first call succeeded but Stripe refund failed), and fires Stripe again. **No `refundId` is stored to prevent this.**

### 5. Admin Invoice Creator Pollutes Bookings Table
**File:** `app/api/admin/financials/payments/route.ts` POST handler
```ts
await prisma.booking.create({
  data: {
    carTier: "STANDARD", // ❌ not a valid tier
    pickup: "N/A",       // ❌ fake data
    dropoff: "N/A",
  },
});
```
Admin-created "invoices" create real Booking records with fake data, corrupting analytics and the nearby driver query.

### 6. Driver Photo Upload Is Local-Only
**File:** `app/driver/home/profile/page.tsx`
```ts
onChange={(e) => {
  const f = e.target.files?.[0];
  if (f) setPhoto(URL.createObjectURL(f)); // ❌ local blob, never uploaded
}}
```
Photo is shown from a local object URL and is lost on refresh. No upload API call is made.

### 7. Payout Balance Reduction Never Happens
When a driver requests a payout, `availableBalance` is calculated as:
```
totalEarned - sum(PAYOUT COMPLETED)
```
Since no PAYOUT ever reaches `COMPLETED` status, the balance never decreases. A driver could request the same amount repeatedly.

### 8. Admin [id] Payment Route — Not Implemented
Directory `app/api/admin/financials/payments/[id]/` exists but contains no `route.ts`. Any per-invoice actions (delete, view detail) would 404.

---

## Security Concerns

| Issue | Severity | File |
|---|---|---|
| Payout API has no balance check before creating transaction | HIGH | `app/api/driver/wallet/payout/route.ts` — a driver could request more than their balance |
| Topup API no-ops but consumes a DB record | MEDIUM | `app/api/driver/wallet/topup/route.ts` |
| Admin financial payments POST — no admin auth check | HIGH | `app/api/admin/financials/payments/route.ts` — no `getSession()` + role check |
| Booking status PATCH — no ownership check for non-driver callers | MEDIUM | Any authenticated session can CANCEL any booking |
| Bank account numbers stored in plain text | HIGH | `DriverOnboarding` model |
| No idempotency key on Payment Intent creation | MEDIUM | Multiple clicks could create multiple intents |

---

## Production Readiness Assessment

| Area | Ready? | Blocker |
|---|---|---|
| Stripe payment collection | ⚠️ Mostly | Hardcoded fare, race condition |
| Booking lifecycle | ⚠️ Mostly | Cancellation policy incomplete |
| Refunds | ✅ Basic | No partial refund, no duplicate guard |
| Driver earnings | ❌ No | Auto-credit missing, commission undefined |
| Driver wallet | ⚠️ Display only | Payout is a fake PENDING record |
| Bank account linking | ❌ No | No dedicated page, no Stripe Connect |
| Withdrawals | ❌ No | Never executes a real transfer |
| Admin payment view | ✅ Good | — |
| Admin payout approval | ❌ No | No UI or API |
| Fare calculation | ❌ No | 100% hardcoded |
| Ride completed page | ❌ No | 100% mock data |
