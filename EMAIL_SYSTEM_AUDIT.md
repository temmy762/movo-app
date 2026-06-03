# EMAIL SYSTEM & FORGOT PASSWORD AUDIT
## movoprive.com Email Infrastructure Review

**Date:** June 3, 2026, 4:51 PM UTC+01:00  
**Status:** ANALYSIS COMPLETE  
**Severity:** CRITICAL - Multiple issues found

---

# EXECUTIVE SUMMARY

| Component | Status | Issue | Severity |
|-----------|--------|-------|----------|
| Email Configuration | ⚠️ INCOMPLETE | Missing Resend API key on VPS | CRITICAL |
| Email Templates | ✅ COMPLETE | All templates implemented | PASS |
| Admin Forgot Password | ⚠️ PARTIAL | OTP via SMS not implemented | HIGH |
| User Forgot Password | ❌ MISSING | No user password reset flow | CRITICAL |
| Password Reset Email | ✅ READY | Template exists, not wired | MEDIUM |
| Email Verification | ✅ READY | Template exists, not wired | MEDIUM |

---

# ISSUE #1: Email Configuration Not Set Up on VPS

## Problem
Email system uses Resend API but credentials not configured on production VPS

## Current Code Status
**File:** `lib/notifications/channels/email.ts` Lines 6-14

```typescript
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@movoprive.com";
const FROM_NAME = process.env.FROM_NAME || "MOVO";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "MOVO";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@movoprive.com";
const LOGO_URL = process.env.LOGO_URL || "https://movoprive.com/logo.png";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://movoprive.com";
```

## What Happens When Not Configured
**File:** `lib/notifications/channels/email.ts` Lines 23-28

```typescript
if (!resend) {
  console.warn("[Email Channel] Resend not configured - email would be sent:", {
    to: payload.recipient.email,
    eventType: payload.eventType,
  });
  return { success: true, messageId: "mock" }; // Return success in dev mode
}
```

**Impact:**
- ❌ Emails are NOT actually sent
- ✅ System returns success (doesn't break flow)
- ⚠️ Users don't receive emails but think they did
- 🔴 Password reset emails never arrive
- 🔴 Verification emails never arrive

## Solution

### Step 1: Get Resend API Key
1. Go to https://resend.com
2. Sign up or log in
3. Create API key
4. Copy the key (starts with `re_`)

### Step 2: Configure on VPS
```bash
ssh root@srv1691570
cd /path/to/movo-app

# Edit .env.production
nano .env.production

# Add these lines:
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@movoprive.com
FROM_NAME=MOVO
NEXT_PUBLIC_APP_NAME=MOVO
NEXT_PUBLIC_BASE_URL=https://movoprive.com
SUPPORT_EMAIL=support@movoprive.com
LOGO_URL=https://movoprive.com/logo.png

# Save (Ctrl+X, Y, Enter)

# Restart PM2
pm2 restart movo

# Verify
pm2 logs movo | grep -i email
```

### Step 3: Verify Configuration
```bash
# Check if env vars are set
echo $RESEND_API_KEY
# Should output: re_your_api_key_here

# Test email sending
# Try password reset flow and check logs
pm2 logs movo | grep "Email Channel"
```

---

# ISSUE #2: Admin Forgot Password - SMS OTP Not Implemented

## Problem
Admin password reset uses OTP via SMS, but SMS service not implemented

## Current Code Status
**File:** `app/api/auth/admin/forgot-password/route.ts` Lines 40-42

```typescript
// TODO: Send SMS with OTP
// For now, log to console (replace with actual SMS service like Twilio, AWS SNS, etc.)
console.log(`[ADMIN OTP] Phone: ${phone}, Code: ${code}`);
```

## What Happens Now
1. Admin enters phone number
2. OTP generated and stored in memory
3. OTP logged to console (NOT sent via SMS)
4. Admin never receives OTP
5. Admin can't reset password

## Architecture Issues

### Issue 2A: In-Memory OTP Storage
**File:** `app/api/auth/admin/forgot-password/route.ts` Line 6

```typescript
const otpStore = new Map<string, { code: string; expires: number }>();
```

**Problems:**
- ❌ OTP lost when server restarts
- ❌ OTP not shared across multiple server instances
- ❌ No persistence
- ❌ Not suitable for production

### Issue 2B: In-Memory Reset Token Storage
**File:** `app/api/auth/admin/verify-otp/route.ts` Line 6

```typescript
const resetTokens = new Map<string, { phone: string; expires: number }>();
```

**Problems:**
- ❌ Tokens lost when server restarts
- ❌ Not shared across instances
- ❌ No persistence

## Solution

### Option A: Use Database for OTP/Tokens (Recommended)

**Step 1: Create Prisma Model**
```prisma
model PasswordReset {
  id        String   @id @default(cuid())
  phone     String
  email     String?
  otp       String
  token     String?
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@index([phone])
  @@index([email])
  @@index([token])
}
```

**Step 2: Create Migration**
```bash
npx prisma migrate dev --name add_password_reset_table
```

**Step 3: Update forgot-password route**
```typescript
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  
  const admin = await prisma.user.findUnique({
    where: { phone },
  });
  
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ success: true });
  }
  
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
  // Store in database
  await prisma.passwordReset.create({
    data: {
      phone,
      otp: code,
      expiresAt,
    },
  });
  
  // Send SMS (implement with Twilio/AWS SNS)
  await sendSMS(phone, `Your OTP is: ${code}`);
  
  return NextResponse.json({ success: true });
}
```

### Option B: Use Twilio for SMS

**Step 1: Install Twilio**
```bash
npm install twilio
```

**Step 2: Set Environment Variables**
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Step 3: Create SMS Service**
```typescript
// lib/sms.ts
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, message: string) {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error("SMS send failed:", error);
    return { success: false, error };
  }
}
```

---

# ISSUE #3: User Forgot Password Flow Missing

## Problem
There is NO forgot password flow for regular users (only for admins)

## Current Situation
**Pages that exist:**
- ✅ `/onboarding/forgot-password` - UI page exists
- ❌ `/api/auth/forgot-password` - API endpoint MISSING
- ❌ `/api/auth/verify-otp` - API endpoint MISSING
- ❌ `/api/auth/reset-password` - API endpoint MISSING

**Pages that don't exist:**
- ❌ `/onboarding/verify-otp` - Page referenced but doesn't exist
- ❌ `/onboarding/set-password` - Page referenced but doesn't exist

## Current Forgot Password Page
**File:** `app/onboarding/forgot-password/page.tsx`

```typescript
export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  
  return (
    <div>
      {/* UI for entering phone or email */}
      <input type="tel" /> {/* Phone input */}
      <input type="email" /> {/* Email input */}
      
      {/* Next button that goes nowhere */}
      <button onClick={() => router.push("/onboarding/verify-otp")}>
        Next
      </button>
    </div>
  );
}
```

**Problems:**
- ❌ No form submission logic
- ❌ No API calls
- ❌ No validation
- ❌ Navigates to non-existent page

## Solution: Implement User Password Reset

### Step 1: Create API Endpoint for User Forgot Password
**Create:** `app/api/auth/forgot-password/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import crypto from "crypto";

const resetTokens = new Map<string, { email: string; expires: number }>();

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success for security (don't reveal if email exists)
      return NextResponse.json({ success: true });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 30 * 60 * 1000; // 30 minutes

    resetTokens.set(resetToken, { email, expires });

    // Build reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding/reset-password?token=${resetToken}`;

    // Send password reset email
    await sendNotification({
      eventType: "RIDER_PASSWORD_RESET",
      recipient: {
        type: "user",
        id: user.id,
        email: user.email,
        firstName: user.firstName,
      },
      data: {
        resetToken,
        resetUrl,
        expiresAt: new Date(expires).toLocaleString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export { resetTokens };
```

### Step 2: Create Reset Password Page
**Create:** `app/onboarding/reset-password/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link");
    }
  }, [token]);

  async function handleReset() {
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reset failed");
        return;
      }

      router.push("/onboarding/login?success=Password reset successfully");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full bg-white flex flex-col items-center justify-start overflow-y-auto" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center pt-8">
          <div className="relative w-28 h-28">
            <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
          </div>
        </div>

        <div className="text-center px-8 mt-6">
          <h1 className="text-[20px] font-semibold text-gray-900">Reset Password</h1>
          <p className="text-gray-400 text-[12px] mt-1">Enter your new password</p>
        </div>

        <div className="px-8 mt-6 space-y-3">
          <div className="border border-gray-400 rounded-lg px-4 py-1 relative">
            <label className="text-[11px] text-gray-500">New Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full focus:outline-none text-sm text-gray-800 pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3 text-gray-400"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="border border-gray-400 rounded-lg px-4 py-1 relative">
            <label className="text-[11px] text-gray-500">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full focus:outline-none text-sm text-gray-800 pr-8"
            />
          </div>

          {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

          <button
            type="button"
            onClick={handleReset}
            disabled={loading || !token}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Create Reset Password API Endpoint
**Create:** `app/api/auth/reset-password/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetTokens } from "../forgot-password/route";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate token
    const tokenData = resetTokens.get(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    if (Date.now() > tokenData.expires) {
      resetTokens.delete(token);
      return NextResponse.json(
        { error: "Token expired" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { email: tokenData.email },
      data: { password: hashedPassword },
    });

    // Clear token
    resetTokens.delete(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
```

### Step 4: Update Forgot Password Page
**Update:** `app/onboarding/forgot-password/page.tsx`

```typescript
"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    setError("");
    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center" style={{ fontFamily: "var(--font-poppins)" }}>
        <div className="text-center px-8">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-[20px] font-semibold text-gray-900">Check your email</h1>
          <p className="text-gray-400 text-[12px] mt-2">We sent a password reset link to {email}</p>
          <button
            onClick={() => router.push("/onboarding/login")}
            className="mt-6 text-[12px] text-blue-600 hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col items-center justify-start overflow-y-auto" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center pt-8">
          <div className="relative w-28 h-28">
            <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
          </div>
        </div>

        <div className="text-center px-8 mt-6">
          <h1 className="text-[20px] font-semibold text-gray-900">Reset Password</h1>
          <p className="text-gray-400 text-[12px] mt-1">Enter your email to receive a reset link</p>
        </div>

        <div className="px-8 mt-6">
          <div className="border border-gray-400 rounded-lg px-4 py-1">
            <label className="text-[11px] text-gray-500">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full focus:outline-none text-sm text-gray-800"
            />
          </div>

          {error && <p className="text-[12px] text-red-500 text-center mt-2">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] mt-6 disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="text-center text-[12px] text-gray-500 mt-4">
            Remember your password?{" "}
            <a href="/onboarding/login" className="font-bold text-gray-900">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

# ISSUE #4: Password Reset Email Not Wired to Forgot Password Flow

## Problem
Password reset email template exists but is never called from forgot password endpoints

## Current Status
- ✅ Template exists: `lib/notifications/templates/emails/generic/password-reset.tsx`
- ✅ Template registered: `lib/notifications/templates/emails/index.ts` Line 63
- ❌ Never called from forgot password flow

## Solution
When user requests password reset, send email:

```typescript
// In forgot-password/route.ts
await sendNotification({
  eventType: "RIDER_PASSWORD_RESET",
  recipient: {
    type: "user",
    id: user.id,
    email: user.email,
    firstName: user.firstName,
  },
  data: {
    resetToken,
    resetUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding/reset-password?token=${resetToken}`,
    expiresAt: new Date(expires).toLocaleString(),
  },
});
```

---

# IMPLEMENTATION CHECKLIST

## Priority 1: Critical (Do First)
- [ ] Set Resend API key on VPS
- [ ] Implement user forgot password flow (3 files)
- [ ] Wire password reset email to forgot password

## Priority 2: High (Do Soon)
- [ ] Move OTP/tokens from memory to database
- [ ] Implement SMS service for admin OTP
- [ ] Add email verification flow

## Priority 3: Medium (Nice to Have)
- [ ] Add rate limiting to password reset
- [ ] Add email confirmation before password change
- [ ] Add password reset history

---

# SUMMARY

| Issue | Severity | Status | Fix Time |
|-------|----------|--------|----------|
| Resend API key missing | CRITICAL | ⚠️ CONFIG | 5 min |
| User password reset missing | CRITICAL | ❌ NOT IMPLEMENTED | 30 min |
| Admin SMS OTP not implemented | HIGH | ⚠️ PARTIAL | 20 min |
| OTP/tokens in memory | HIGH | ⚠️ DESIGN | 30 min |
| Password reset email not wired | MEDIUM | ⚠️ PARTIAL | 5 min |

**Total Implementation Time:** 90 minutes

---

**Audit Date:** June 3, 2026  
**Status:** READY FOR IMPLEMENTATION  
**Next Step:** Set Resend API key on VPS, then implement user password reset flow

