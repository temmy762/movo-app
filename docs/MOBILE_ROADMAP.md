# Movo Privé — Mobile Apps Roadmap (Android + iOS)

Working plan for rebuilding the Movo web app as two native apps with React Native,
kept consistent with the web app in modules, operations, API endpoints and design.

- **Chauffeur app**: first (as agreed with Movo).
- **Customer app**: second.
- **Admin**: stays on the web (`/admin`). It is not part of the mobile scope.

Written 2026-10-23 from a full read of `movo-web` (Next.js 16, Prisma 7, Socket.IO,
Stripe, Resend, Twilio). Update this file as decisions change.

---

## 1. Guiding principles

1. **One backend.** The apps call the same `movoprive.com/api/*` endpoints as the web app.
   - No second backend and no duplicated business logic.
   - Fares, dispatch, refunds, earnings and timers stay on the server.
2. **The server is the source of truth.**
   - The apps never compute fares, earnings or GST; they display what the API returns.
   - Fares always come from the server-signed quote (`lib/fareQuote.ts`).
3. **Same vocabulary everywhere.**
   - Socket event names come from `lib/socket/events.ts`.
   - Tier labels come from `lib/tierLabels.ts`.
   - Statuses use the Prisma enums.
   - Booking references (`MOVO-B-000001`) are formatted by the server.
   - Times use America/Winnipeg (`lib/winnipegTime.ts`).
4. **Same launch scope.** The `lib/launchConfig.ts` flags are mirrored.
   - On today: Safe Ride and In-City.
   - Off today: airport, hourly and rental. They stay hidden in the apps too.
5. **Same look.** Design tokens are copied 1:1 from `app/globals.css`: brand colours, fonts, radii, pixel font sizes.
6. **Backend changes go in `movo-web` first.** They must be backwards-compatible, so the live web app never breaks.

---

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (React Native) + TypeScript**, managed workflow with dev builds | One codebase for iOS and Android. EAS Build makes iOS builds possible from Windows. |
| Navigation | **expo-router** (file-based) | Mirrors the Next.js App Router folder structure, so screens map 1:1 to web pages |
| Styling | **StyleSheet + `@movo/ui` tokens** (NativeWind dropped at Phase 0) | Tokens mirror globals.css one-to-one. Avoids NativeWind's Babel/Reanimated setup on a brand-new SDK; can be added later without changing screens' look |
| Server state | **TanStack Query** | Caching, retry and refetch-on-focus replace the web's `useEffect` + fetch + polling |
| Local state | **Zustand** | Session, online toggle, active ride |
| Realtime | **socket.io-client**, path `/api/socketio` | Same server and same events as the web |
| Maps | **react-native-maps** (Google provider on both platforms) + Google Places/Directions through our API | Matches the web's Google Maps |
| Location | **expo-location + expo-task-manager** | Background location for chauffeurs online or on a trip |
| Push | **expo-notifications** (FCM + APNs via the Expo Push service) | Replaces web-push |
| Payments | **@stripe/stripe-react-native** (PaymentSheet, SetupIntent) | Same PaymentIntent and SetupIntent endpoints |
| Secure storage | **expo-secure-store** | Session token (Keychain / Keystore) |
| Uploads | expo-image-picker, expo-document-picker, expo-camera | Onboarding documents, profile photo, incident photos |
| External flows | expo-web-browser (`openAuthSessionAsync`) | Stripe Connect onboarding, legal pages |
| Forms | react-hook-form + zod | Validation matches the server rules |
| Sounds and haptics | expo-audio, expo-haptics | New-ride alert (`lib/driver-alert-sounds.ts`) |
| Fonts | expo-font: **Inter** (headings), **DM Sans** (body) | Same as `app/layout.tsx` |
| Crash reporting | Sentry (sentry-expo) | Production visibility |
| Builds and updates | **EAS Build, EAS Submit, EAS Update (OTA)** | Store builds from Windows, plus quick JS fixes without store review |

Pinned at creation (2026-10-24): **Expo SDK 58**, React Native 0.88, React 19.3, expo-router 58, TypeScript 6.0. Exact versions are in `movo-mobile/apps/chauffeur/package.json`.

---

## 3. Repository layout

A new repo, `movo-mobile`, set up as an npm-workspaces monorepo:

```
movo-mobile/
├── apps/
│   ├── chauffeur/            # Expo app — "Movo Chauffeur"  (com.movoprive.chauffeur)
│   │   └── app/              # expo-router screens (mirror app/driver/* on web)
│   └── customer/             # Expo app — "Movo Privé"      (com.movoprive.app)
│       └── app/              # expo-router screens (mirror app/home/* on web)
├── packages/
│   ├── shared/               # copied/synced from movo-web — NO RN or Node deps
│   │   ├── socketEvents.ts   # ← lib/socket/events.ts
│   │   ├── tierLabels.ts     # ← lib/tierLabels.ts
│   │   ├── winnipegTime.ts   # ← lib/winnipegTime.ts
│   │   ├── launchConfig.ts   # ← lib/launchConfig.ts (flags only)
│   │   ├── enums.ts          # ← Prisma enums (BookingStatus, CareRole, …)
│   │   └── types.ts          # API response shapes (Booking, Driver, Wallet, …)
│   ├── api/                  # typed API client: fetch wrapper + one function per endpoint
│   │   ├── client.ts         # base URL, Bearer token, 20s AbortController, error shape
│   │   ├── socket.ts         # socket.io client + join/on/leave (port of context/SocketContext.tsx)
│   │   └── endpoints/        # auth.ts, bookings.ts, driver.ts, care.ts, stripe.ts, …
│   └── ui/                   # design system
│       ├── tokens.ts         # colours, gradients, radii, font sizes from app/globals.css
│       └── components/       # Button, Card, BottomSheet, StatusBadge, MoneyText, MapView, …
└── scripts/
    └── sync-shared.mjs       # copies the shared files from ../movo-web and flags drift
```

**Sync rule:** whenever any of the files mapped above changes in `movo-web`:
1. Run `npm run sync-shared` in the mobile repo.
2. Commit both repos.

`sync-shared` fails the build if a copied file has drifted from the web version.

---

## 4. Backend work in `movo-web` (Phase 0, before any screens)

Mobile can't rely on cookies, browser redirects or web-push. All of these changes are additive; the web app keeps working unchanged.

| # | Change | Where | Notes |
|---|---|---|---|
| B1 | **Return the session token in the login response** when the client sends `X-Movo-Client: mobile` | `api/auth/login`, `api/auth/driver/login`, `api/auth/register`, `api/auth/driver/register` | `lib/session.ts` `resolveToken()` already accepts `Authorization: Bearer`. Only the token delivery is missing. |
| B2 | **Longer mobile sessions** (e.g. 90 days) plus `POST /api/auth/logout` deleting by Bearer | `lib/session.ts`, `api/auth/logout` | Web stays at 7 days |
| B3 | **Authenticate socket joins** (a security fix the web needs too) | `server.js` `join` handler | Today any client can `join` `admin`, `driver:<id>` or `booking:<id>` with no check. Validate the session from the cookie or `auth.token` in the handshake, and only allow the rooms that session owns. Required before mobile. |
| B4 | **Native push tokens**: `DeviceToken` model (token, platform, userId/driverId) and `POST/DELETE /api/push/device` | `prisma/schema.prisma` + migration, `api/push/device` | |
| B5 | **Expo push channel** next to web-push | `lib/notifications/channels/push.ts` | Same events, same copy. Follow the 5-file notification rule. |
| B6 | **Stripe PaymentSheet support**: `POST /api/stripe/payment-sheet` returns `{ paymentIntent, ephemeralKey, customer }` from the same quote logic | new route reusing `create-payment-intent` + `lib/stripeCustomer.ts` | The amount still comes from the signed quote |
| B7 | **Stripe Connect return to the app**: a `/connect/return` web page that redirects to `movochauffeur://banking?connect=success` | `api/driver/stripe-connect` (accept `?client=mobile`), new page | `openAuthSessionAsync` catches the redirect |
| B8 | **Account deletion** (required by both App Store and Play Store): `DELETE /api/user/profile` and `DELETE /api/driver/profile` (soft delete, anonymise, keep financial records) | new handlers | Store rejection risk if missing |
| B9 | **App config endpoint**: `GET /api/app/config` → `{ minVersion, launchFlags, supportPhone, pricingVersion }` | new route | Forces old builds to update and sends launch flags to the apps |
| B10 | **Background location batch**: `POST /api/driver/location` accepts an array of points | `api/driver/location` | Background tasks deliver batches |
| B11 | **Social login for native** (later): `POST /api/auth/google/native` verifies the ID token; **Sign in with Apple** is mandatory on iOS if Google/Facebook login is offered | new routes | Launch with email/password only to avoid this, then add it later |
| B12 | **Universal / App Links**: `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` | `public/.well-known/` | Email links (receipts, reset password) open the app |

Each item is built, run through `npm run build`, and pushed to master as usual. The VPS deploy stays `git pull`, `npm run build`, `pm2 restart movo-web`.

---

## 5. Module map: web → mobile

### 5a. Chauffeur app (`apps/chauffeur`), built FIRST

| Module | Web pages | API endpoints | Mobile notes |
|---|---|---|---|
| Auth | `driver/onboarding/login`, `forgot-password`, `reset-password`, `set-password` | `auth/driver/login`, `forgot-password`, `reset-password`, `auth/logout`, `auth/me` | Token in SecureStore. Show the closed-account error (403) as on web. |
| Onboarding (individual) | `driver/onboarding/{type,register,register/step2,chauffeur,pending,approved,rejected,success}` | `auth/driver/register`, `driver/onboarding`, `onboarding/document(/upload)`, `onboarding/status`, `onboarding/submit`, `driver/training` | Camera/document picker. The server sniffs content (`lib/uploads.ts`), so send real MIME types. Resume onboarding at `currentStep`. |
| Onboarding (fleet partner) | `driver/onboarding/partner/*` | same + vehicle, fleet | Phase 2 of the chauffeur app if Movo needs it at launch |
| Home / go online | `driver/home` (2,329 lines; split into hooks) | `driver/status`, `driver/location`, `driver/active-booking`, `care/driver`, `driver/stats` | Online toggle, background location, restore the active ride on launch (merged `active-booking` + `care/driver`), account-inactive gate (`lib/driverAccess.ts`) |
| Ride requests | `driver/home` request card | sockets `booking.created` (tier room), `care.primary.dispatched`, `care.support.dispatched`; `bookings/[id]` accept, `bookings/[id]/decline` | Full-screen alert, sound, haptics, countdown. **Push notification when the app is in the background.** Care bookings never come from tier rooms. |
| Live ride (standard) | `driver/home`, `driver/tracking/[bookingId]` | `bookings/[id]/en-route`, `arrived`, `start`, `status`, `driver-location`, `driver-cancel`, `rider-location`, `destination`, `stops` | Status machine: accepted → en-route → arrived (waiting timer, `lib/waitingCharge.ts`) → started → completed. Handle `booking.route.updated`. Driver cancel re-dispatches. |
| Live ride (Safe Ride) | same | `care/assignments/[id]`, `care/assignments/[id]/en-route`, `care/[bookingId]` | PRIMARY / SUPPORT roles, co-driver card (`{ assignment, coDriver }`), `care.support.pickupReady`, `care.primary.pickupEnRoute` |
| Chat | `driver/home/finish/chat` | `bookings/[id]/messages`, socket `message.new` | Push on new message. Returning from chat must keep the ride (the earlier web bug). |
| Finish / rating | `driver/home/finish`, `finish/rating`, `finish/my-rides` | `bookings/[id]/rating`, `driver/rides` | |
| Planned rides | `driver/home/planned` | `driver/reserved`, `driver/rides?tab=upcoming` | Reservation reminders come as push |
| Wallet and payouts | `driver/home/wallet` | `driver/wallet`, `driver/wallet/payout` | Same redesigned UI. Socket `wallet.updated`. |
| Banking (Stripe Connect) | `driver/home/profile/banking` | `driver/stripe-connect` GET/POST, `driver/profile/banking` | B7 redirect back to the app |
| Profile | `driver/home/profile/*` (vehicle, feedback, help, legal, privacy, gps-policy) | `driver/profile`, `profile/photo`, `driver/vehicle`, `driver/ratings` | Legal pages may open in an in-app browser |
| Incidents and lost items | `driver/home/report-incident`, `report-found-item` | `incidents`, `lost-found` | Photo upload |
| News / offers | `driver/home/news`, `offers` | (static or in-app) | Low priority |
| Rentals | `driver/home/rentals` | `driver/rental` | **Hidden** (`VEHICLE_RENTAL_ENABLED = false`); not built at launch |

### 5b. Customer app (`apps/customer`), built SECOND

| Module | Web pages | API endpoints | Mobile notes |
|---|---|---|---|
| Auth | `onboarding/*`, `user/login`, `user/register` | `auth/login`, `auth/register`, `auth/forgot-password`, `reset-password`, `auth/me` | Email/password at launch. Google/Facebook + Apple later (B11). |
| Home | `home` (search, service cards, "Your next trip", "Need help choosing?") | `user/bookings`, `admin/pricing` (public GET) | Mobile layout of the current home page |
| In-City booking | `home/pickup`, `pickup/available-cars`, `ride/confirm`, `home/payment` | `bookings/estimate` (signed quote), `bookings`, `stripe/payment-sheet` (B6), `stripe/payment-methods`, `stripe/charge-saved` | Places autocomplete, tier list (Standard / Executive / Concierge with the new images), Winnipeg date/time picker |
| Safe Ride booking | `home/pickup?service=care` (4-step flow, `SafeRideSteps`) | `bookings/estimate`, `bookings/care` | Steps: route → vehicle → contact & authorisation → pay. No tier list and no explanation page. |
| Live tracking | `home/ride/tracking` (1,668 lines) | `tracking/[bookingId]`, `bookings/[id]`, `rider-location`, `destination`, `stops`, `add-stop`, `status` (cancel) | Sockets: driver.location, driver.arrived, trip.started, booking.status, booking.completed, booking.cancelled, route updated, care.*. Creation-recovery states, cancel policy dialog, Contact Support after the trip starts, Safe Ride no-chauffeur sheet. |
| Chat | inside tracking | `bookings/[id]/messages` | |
| Completed / rating / receipt | `ride/completed`, `rides/[id]`, `rides/[id]/receipt` | `bookings/[id]/rating`, `bookings/[id]/receipt` | Receipt shared as PDF (expo-print + expo-sharing) plus "Email me this receipt" |
| Rides history | `home/rides` | `user/bookings` | |
| Payment methods | `home/payment`, `payment/add-card` | `stripe/setup-intent`, `stripe/payment-methods` | Stripe CardField or PaymentSheet in setup mode |
| Profile and settings | `home/profile/*`, `home/settings` | `user/profile` | Account deletion (B8) |
| Help / support | `home/help` (incl. `?topic=choosing`), `contact` | `support`, `contact`, `complaints` | |
| Notifications | `home/notifications` | `notifications` | In-app list plus push |
| Promotions | `home/promotions` | (as on web) | |
| Incidents and lost items | `home/report-incident`, `report-lost-item` | `incidents`, `lost-found` | |
| Party bus / airport / hourly | `home/party-bus` and the related modes | — | **Hidden** per launchConfig |

---

## 6. Realtime contract (same as web)

- Connect to `https://movoprive.com`, path `/api/socketio`, transports `["websocket"]`, unlimited reconnection.
- After B3, send the token in `auth: { token }`.
- `join` payloads exactly as the web sends them:
  - chauffeur: `{ role: "driver", id, tier }`, plus `{ bookingId }` during a ride
  - customer: `{ role: "user", id, bookingId }`
- On reconnect or app foreground:
  1. Re-join the rooms.
  2. **Refetch the REST state** (active booking / tracking), because sockets can miss events while the app sleeps.
- Background behaviour: sockets drop when the app is backgrounded. **Push notifications carry every critical event** (new request, accepted, arrived, started, completed, cancelled, new message, dispatch failed). Foregrounding resyncs over REST.
- Event names come only from `packages/shared/socketEvents.ts`. No string literals.

---

## 7. Design consistency

**Tokens** (from `app/globals.css` and CLAUDE.md):

- **Colours**
  - Navy `#131936`, black `#0A0A0F`, slate `#2A3055`, ivory `#F5F5F2`, steel `#8A8F9E`, taupe `#C6BFB2`, deep navy `#1a1a2e`
  - Screen background `#F5F5F2`, text `#0A0A0F`
- **Gradients** (expo-linear-gradient)
  - CTA: `#0A0A0F → #131936 → #2A3055`
  - Silver: `#8A8F9E → #C6BFB2 → #F5F5F2`
  - Brand bar: `#1a1a2e → #131936 → #C6BFB2`
- **Type**: Inter for headings, DM Sans for body. Explicit sizes 11 / 12 / 13 / 14 / 15 / 20.
- **Shape**
  - Cards `rounded-xl` / `rounded-2xl`
  - Bottom sheets `rounded-3xl` (top corners)
  - Buttons `rounded-xl`
- **Assets**
  - Tier images from `public/images/tiers/*.png`
  - Logos from `public/images/logo/`
  - App icons and splash screen made from the Movo logo

**Rules:**

- Every screen starts from the matching web page. Same copy, order, labels and status names.
  - Chauffeur statuses: Active / Suspended / Inactive.
  - Tier names via `tierLabels`.
- Money via one `formatMoney()` (CAD, 2 decimals), the same as the web `money()`. Times via `winnipegTime`.
- Native patterns where they clearly help:
  - bottom sheets (`@gorhom/bottom-sheet`) instead of web modals
  - native date/time pickers
  - pull-to-refresh
  - haptics on key actions
  - safe areas
- Accessibility: minimum 44pt tap targets, dynamic type within limits, screen reader labels on icon buttons.

---

## 8. Phases and milestones

The estimates assume one developer (me) with Daniel reviewing. Store review time is extra.

**Phase 0: Foundations (week 1)**
- [x] Backend B1–B5, B7–B10 in `movo-web` (2026-10-24, commits df85e9d + d65ee69). Push goes out through `lib/webpush.ts`, which now sends to both web-push and the apps.
- [ ] Apply migration `20261024_device_tokens` on production
- [ ] B6 (PaymentSheet) and B12 (universal links) are deferred to Phase 3 (customer app)
- [x] Create the `movo-mobile` monorepo + chauffeur app (`com.movoprive.chauffeur`, scheme `movochauffeur`), 2026-10-24, github.com/temmy762/movo-mobile. Customer app is scaffolded in Phase 3.
- [ ] EAS projects (needs Movo's Expo account or Daniel's; Apple/Google accounts from Movo)
- [x] `packages/shared` + `sync-shared` script (also generates Prisma enums; `npm run check-shared` flags drift)
- [x] `packages/api` client + socket wrapper (auth, app config, push endpoints so far; the rest are added per screen)
- [x] `packages/ui` tokens + Button, Card, Input, StatusBadge, MovoText
- [ ] BottomSheet, MapView, Toast (Phase 1, with react-native-maps)
- [ ] Dev builds running on a physical Android device and an iPhone (via EAS)

**Phase 1: Chauffeur app MVP (weeks 2–4)**
- [ ] Auth + session restore + account-inactive gate
- [ ] Onboarding (individual) with document upload, pending / approved / rejected
- [ ] Home: online toggle, background location (B10), map, stats
- [ ] Ride requests: socket + push + alert sound + accept/decline countdown
- [ ] Standard ride flow: en-route → arrived (waiting timer) → start → end, driver cancel, route updates
- [ ] Safe Ride flow: PRIMARY / SUPPORT, co-driver card, pickup-ready events
- [ ] Chat, finish, rating, my rides, planned rides
- [ ] Wallet + payout, banking with Stripe Connect (B7)
- [ ] Profile, vehicle, help/legal, incident + found item
- [ ] Account deletion screen

**Phase 2: Chauffeur app testing and release (week 5)**
- [ ] End-to-end on live staging data with Movo's chauffeurs: TestFlight (iOS) + Play internal testing
- [ ] Background location: battery check and accuracy check during a real ride
- [ ] Store listings, privacy labels, background-location justification video (Play), screenshots
- [ ] Submit to App Store + Play Store

**Phase 3: Customer app MVP (weeks 6–8)**
- [ ] Backend B6 (PaymentSheet), B12 (universal links)
- [ ] Auth, home, In-City booking with the signed quote + PaymentSheet / saved cards
- [ ] Safe Ride 4-step booking
- [ ] Live tracking (all states), chat, cancel with policy, stop/destination changes
- [ ] Completed, rating, receipt PDF / email, rides history
- [ ] Payment methods, profile, settings, help, notifications, incidents, lost items, account deletion

**Phase 4: Customer app testing and release (week 9)**
- [ ] TestFlight + Play internal testing with real (small) live payments, then refund
- [ ] Store submission

**Phase 5: Later**
- [ ] Google + Apple + Facebook sign-in (B11)
- [ ] Fleet-partner onboarding in the app (if not done in Phase 1)
- [ ] OTA update discipline, analytics, crash dashboards
- [ ] Re-enable airport / hourly / rental when Movo flips the launch flags

---

## 9. Store and account requirements (Movo to provide)

- **Apple Developer Program** (US$99/yr) and **Google Play Console** (US$25 once), both **in Movo's name**. Add Daniel as a developer.
- App names, short descriptions, support URL (`movoprive.com/contact`), privacy policy URL (`movoprive.com/privacy-policy`).
- **Background location (chauffeur app):** Apple and Google both require a clear in-app disclosure plus store justification. Play also needs a short video.
  - Reuse the existing GPS policy page (`driver/home/profile/gps-policy`).
- **Payments:** rides are physical services, so Stripe is allowed (no Apple/Google in-app purchase required).
- **Account deletion** in-app is mandatory on both stores (B8).
- **Demo accounts** for store reviewers: one test chauffeur (ACTIVE, with vehicle) and one test customer, with a note explaining that live rides depend on chauffeurs being online.
- Firebase project (FCM) + APNs key for push, under Movo's accounts.

---

## 10. Verification approach

- **No iOS simulator on Windows.** iOS is tested with EAS dev builds on a physical iPhone (Daniel's or Movo's) and TestFlight. Android uses an emulator plus a physical device.
- Every backend change: `npm run build` in `movo-web`, push, deploy on the VPS, confirm live. This keeps the existing workflow.
- Every mobile milestone:
  1. Typecheck + lint.
  2. Run on a device.
  3. Run through the matching web flow side by side to confirm the same states, copy and numbers.
- Ride flows are tested with two devices: chauffeur app + customer web (Phase 1), then chauffeur app + customer app (Phase 3).
- Payments: test mode on dev builds. One small live payment + refund before each store release.

---

## 11. Risks and decisions log

| Risk / decision | Plan |
|---|---|
| Unauthenticated socket joins (B3) | Fix before mobile ships. It's also a live web security issue. |
| Large web pages (`driver/home` 2.3k lines, `ride/tracking` 1.7k) | Split into hooks (`useActiveRide`, `useRideRequests`, `useDriverLocation`) and small components in mobile. Don't port them as single files. |
| Missed socket events while backgrounded | Push for critical events + REST resync on foreground |
| iOS background location killed by the OS | `expo-location` background updates with `showsBackgroundLocationIndicator` and `pausesUpdatesAutomatically: false`, plus server-side staleness tolerance (online = checked in within 10 min, as the admin stats already assume) |
| Shared code drift between repos | `sync-shared` drift check + the sync rule in section 3 |
| Store rejection | Account deletion, privacy labels, location disclosure, reviewer demo accounts, Sign in with Apple only if social login is added |
| Budget | Milestone 4 = Chauffeur app, Milestone 5 = Customer app, each paid separately (exact agreed amounts to be confirmed by Daniel). Movo's half payment is expected before the builds start. |
