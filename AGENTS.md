<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# MOVO Web App — Project Instructions for Claude

## Overview
MOVO is a luxury ride-hailing platform built with Next.js (App Router). It features standard ride booking, a specialized "Care Ride" service requiring dual-driver dispatch (PRIMARY + SUPPORT chauffeurs), admin dashboards, driver onboarding, real-time tracking, and a multilingual notification system.

## Tech Stack
- **Framework:** Next.js 14+ (App Router, TypeScript)
- **ORM:** Prisma (PostgreSQL)
- **Real-time:** Socket.IO
- **Email:** Resend
- **SMS:** Twilio
- **Payments:** Stripe
- **Styling:** Tailwind CSS
- **Maps:** Dynamic imports (Google Maps / similar — always SSR-disabled)
- **Deployment:** PM2 (ecosystem.config.cjs), Vercel-compatible

## Project Structure
```
movo-web/
├── app/
│   ├── api/                    # API routes (App Router conventions)
│   │   ├── bookings/           # Generic ride booking endpoints
│   │   ├── bookings/care/      # Care Ride booking creation
│   │   ├── care/               # Care Ride dispatch, assignments, driver endpoints
│   │   ├── admin/care/         # Admin Care Ride management
│   │   ├── driver/             # Driver onboarding, stats, active booking
│   │   └── admin/              # Admin bookings, drivers, fleet management
│   ├── admin/(panel)/          # Admin dashboard pages
│   ├── driver/                 # Driver app pages (home, tracking, onboarding)
│   ├── landing/                # Public marketing pages
│   └── layout.tsx              # Root layout
├── lib/
│   ├── socket/dispatcher.ts    # Centralized Socket.IO event dispatchers
│   ├── care/dispatch.ts        # Care Ride dispatch logic (radius search, retries)
│   ├── notifications/          # Notification system (types, templates, channels, index)
│   │   ├── types.ts            # Event type definitions
│   │   ├── templates/emails/   # Email templates (organized by audience)
│   │   ├── channels/sms.ts     # SMS templates
│   │   └── index.ts            # Notification orchestration (notifyAdmins, notifyUser, etc.)
│   └── prisma.ts               # Prisma client singleton
├── prisma/schema.prisma        # Database schema
├── ecosystem.config.cjs        # PM2 process config
└── package.json
```

## Key Domain Concepts

### Booking Types
- **Standard rides:** Single driver, standard accept/arrive/start/complete flow.
- **Care Rides:** Require TWO drivers — a PRIMARY chauffeur (transports the client) and a SUPPORT chauffeur (drives the client's vehicle to the destination). Dispatched separately via radius-based search with retry rounds (30s timeout, max 3 rounds).

### Care Ride Dispatch Flow
1. Care booking created → `dispatchCareBookingCreated` (admin-only notification, NOT broadcast to driver tier rooms).
2. System searches for PRIMARY driver within radius → dispatches via `CARE_PRIMARY_DISPATCHED` socket event.
3. After PRIMARY accepts, system searches for SUPPORT driver → dispatches via `CARE_SUPPORT_DISPATCHED`.
4. If either search exhausts retries → `notifyDispatchExhausted()` alerts admins (email + SMS) and the primary driver.
5. Each driver can see the other's status via the `/api/care/driver` endpoint (returns `assignment` + `coDriver`).

### Socket Events
- `BOOKING_CREATED`, `BOOKING_CANCELLED` — standard rides
- `CARE_PRIMARY_DISPATCHED`, `CARE_SUPPORT_DISPATCHED`, `CARE_BOOKING_CLOSED` — Care rides
- Care bookings must NEVER be broadcast to generic driver tier rooms (this caused a stale "Searching" bug — fixed).

### Notification System
- Event types defined in `lib/notifications/types.ts`
- Channels: email (Resend), SMS (Twilio), in-app
- `notifyAdmins()` sends to all admin users via email + SMS (if phone available)
- `notifyUser()` sends to a specific user
- Always register new event types in both `types.ts` and `index.ts`
- Email templates are React components in `lib/notifications/templates/emails/`

## Code Conventions

### General
- TypeScript everywhere — no plain JS files in `app/` or `lib/`
- 2-space indentation for TS/TSX
- camelCase for variables/functions, PascalCase for components/types
- Keep functions small and focused
- Meaningful comments for complex logic only — no obvious comments

### API Routes
- Use `NextResponse.json()` for all responses
- Always wrap in try/catch with descriptive `console.error("[route-name]", e)`
- Return proper HTTP status codes (400, 401, 403, 404, 409, 500)
- Auth check at the top of each route (session-based)

### Prisma
- Use the singleton client from `lib/prisma.ts` — never instantiate directly
- Use `select` for targeted queries, `include` for relations
- Care assignments have roles: `PRIMARY` | `SUPPORT`
- A driver must NEVER be assigned as both PRIMARY and SUPPORT on the same booking (guard enforced in `app/api/admin/care/route.ts`)

### React Components
- `"use client"` directive at top of client components
- `dynamic()` with `ssr: false` for map components
- Stateful pages use `useState` + `useEffect` + `useRef` pattern
- Socket listeners use the `useSocket` context: `const { join, on } = useSocket()`
- Always clean up socket listeners in `useEffect` return
- Use `useRef` for values needed in async callbacks to avoid stale closures

### Styling
- Tailwind CSS classes inline
- Brand colors: `#131936` (dark navy), `#C6BFB2` (gold/tan), `#1a1a2e` (deep black-navy)
- Gradients: `linear-gradient(90deg, #1a1a2e, #131936, #C6BFB2)`
- Rounded corners: `rounded-xl`, `rounded-3xl` for bottom sheets
- Font sizes: `text-[12px]`, `text-[13px]`, `text-[14px]` — explicit pixel sizes
- Use `no-hover-fx` class on buttons to disable hover effects

## Environment Variables
- `.env.development`, `.env.production`, `.env.example` — all exist
- Key vars: `DATABASE_URL`, `RESEND_API_KEY`, `TWILIO_*`, `STRIPE_*`, `NEXTAUTH_SECRET`
- Never hardcode API keys — always use env vars

## Important Gotchas

1. **Care bookings must stay isolated** — never let them into the generic booking pool (`app/api/bookings/route.ts` has `bookingType: { not: "CARE" }` filter) or generic socket dispatch.
2. **Admin actions need timeouts** — always use `AbortController` (20s) on admin API calls from the frontend to prevent UI hangs.
3. **Socket room isolation** — Care Ride drivers should only receive Care-specific events, not generic booking events.
4. **Co-driver data** — `/api/care/driver` returns `{ assignment, coDriver }`. Always destructure both.
5. **Notification registration** — when adding a new notification event, update all 5 files: `types.ts`, `index.ts`, email template file, `templates/emails/index.ts`, and `channels/sms.ts`.

## When Making Changes

- Prefer minimal, focused edits — don't refactor unrelated code.
- Follow existing patterns in the file you're editing.
- Never delete or weaken tests without explicit direction.
- If a change touches Socket events, check both the dispatcher (`lib/socket/dispatcher.ts`) and all consumers (driver/admin pages).
- If a change touches notifications, update all 5 files listed above.
- If a change touches Prisma schema, run `npx prisma generate` and create a migration.
- Always verify imports are at the top of the file — never mid-file.

## Running the Project
```bash
npm install
npx prisma generate
npx prisma migrate dev    # for development
npm run dev               # starts Next.js dev server
```

For production with PM2:
```bash
npm run build
pm2 start ecosystem.config.cjs
```
