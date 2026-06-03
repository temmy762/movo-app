# EMAIL SYSTEM IMPLEMENTATION GUIDE
## Quick Start for Email & Password Reset

**Status:** Ready to implement  
**Estimated Time:** 90 minutes  
**Difficulty:** Medium

---

# QUICK CHECKLIST

## Phase 1: Configure Resend (5 minutes)
- [ ] Get Resend API key from https://resend.com
- [ ] SSH to VPS
- [ ] Add `RESEND_API_KEY` to `.env.production`
- [ ] Restart PM2

## Phase 2: Implement User Password Reset (30 minutes)
- [ ] Create `app/api/auth/forgot-password/route.ts`
- [ ] Create `app/api/auth/reset-password/route.ts`
- [ ] Create `app/onboarding/reset-password/page.tsx`
- [ ] Update `app/onboarding/forgot-password/page.tsx`
- [ ] Test locally
- [ ] Deploy to VPS

## Phase 3: Fix Admin OTP (20 minutes)
- [ ] Create Prisma model for password resets
- [ ] Run migration
- [ ] Update admin forgot password to use database
- [ ] Implement SMS service (Twilio)

## Phase 4: Testing (15 minutes)
- [ ] Test user password reset flow
- [ ] Test admin password reset flow
- [ ] Verify emails are sent
- [ ] Check logs

---

# STEP-BY-STEP IMPLEMENTATION

## Step 1: Configure Resend on VPS

```bash
# 1. SSH to VPS
ssh root@srv1691570

# 2. Navigate to project
cd /path/to/movo-app

# 3. Edit environment file
nano .env.production

# 4. Add these lines (get key from https://resend.com):
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@movoprive.com
FROM_NAME=MOVO
NEXT_PUBLIC_APP_NAME=MOVO
NEXT_PUBLIC_BASE_URL=https://movoprive.com
SUPPORT_EMAIL=support@movoprive.com
LOGO_URL=https://movoprive.com/logo.png

# 5. Save (Ctrl+X, Y, Enter)

# 6. Restart PM2
pm2 restart movo

# 7. Verify
pm2 logs movo | grep -i email
```

## Step 2: Create Forgot Password API

**Create file:** `app/api/auth/forgot-password/route.ts`

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

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 30 * 60 * 1000;

    resetTokens.set(resetToken, { email, expires });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding/reset-password?token=${resetToken}`;

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

## Step 3: Create Reset Password API

**Create file:** `app/api/auth/reset-password/route.ts`

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

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email: tokenData.email },
      data: { password: hashedPassword },
    });

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

## Step 4: Create Reset Password Page

**Create file:** `app/onboarding/reset-password/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

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
    <div
      className="h-full bg-white flex flex-col items-center justify-start overflow-y-auto"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center pt-8 sm:pt-6">
          <div className="relative w-28 h-28 sm:w-24 sm:h-24">
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
              className="w-full focus:outline-none text-sm text-gray-800 pr-8 leading-tight"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3 text-gray-400"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>

          <div className="border border-gray-400 rounded-lg px-4 py-1 relative">
            <label className="text-[11px] text-gray-500">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full focus:outline-none text-sm text-gray-800 pr-8 leading-tight"
            />
          </div>

          {error && <p className="text-[12px] text-red-500 text-center">{error}</p>}

          <button
            type="button"
            onClick={handleReset}
            disabled={loading || !token}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] tracking-wide disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, #1a1a2e 0%, #2D0A53 50%, #8B7500 100%)" }}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <p className="text-center text-[12px] text-gray-500">
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

## Step 5: Update Forgot Password Page

**Update file:** `app/onboarding/forgot-password/page.tsx`

Replace entire content with:

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
      <div
        className="h-full bg-white flex flex-col items-center justify-center"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        <div className="text-center px-8">
          <div className="text-5xl mb-4">✓</div>
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
    <div
      className="h-full bg-white flex flex-col items-center justify-start overflow-y-auto"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center pt-8 sm:pt-6">
          <div className="relative w-28 h-28 sm:w-24 sm:h-24">
            <Image src="/images/image_1.png" alt="MOVO PRIVÉ" fill className="object-contain" priority />
          </div>
        </div>

        <div className="text-center px-8 mt-6">
          <h1 className="text-[20px] font-semibold text-gray-900">Reset Password</h1>
          <p className="text-gray-400 text-[12px] mt-1">Enter your email to receive a reset link</p>
        </div>

        <div className="px-8 mt-6">
          <div className="border border-gray-400 rounded-lg px-4 pt-1 pb-1">
            <label className="text-[12px] text-gray-500">Email Address</label>
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
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] mt-6 tracking-wide disabled:opacity-60"
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

## Step 6: Test Locally

```bash
# 1. Start dev server
npm run dev

# 2. Test forgot password flow
# Visit http://localhost:3000/onboarding/forgot-password
# Enter email
# Check console for email send attempt

# 3. Check if email would be sent (in dev mode, it logs to console)
# Look for: "[Email Channel] Resend not configured"
```

## Step 7: Deploy to VPS

```bash
# 1. Commit changes
git add -A
git commit -m "feat: Implement user password reset flow"
git push origin master

# 2. SSH to VPS
ssh root@srv1691570
cd /path/to/movo-app

# 3. Pull and deploy
git pull origin master
npm run build
pm2 restart movo

# 4. Verify
pm2 logs movo
```

---

# TESTING CHECKLIST

## Local Testing
- [ ] Forgot password page loads
- [ ] Email input validation works
- [ ] Submit button sends request
- [ ] Success message appears
- [ ] Reset password link works
- [ ] Password reset page loads
- [ ] Password validation works
- [ ] Password reset succeeds
- [ ] Can login with new password

## Production Testing
- [ ] Set Resend API key on VPS
- [ ] Test forgot password flow
- [ ] Check if email is sent (check Resend dashboard)
- [ ] Click reset link in email
- [ ] Reset password
- [ ] Login with new password

---

# TROUBLESHOOTING

## Email not sending
```bash
# Check if Resend API key is set
echo $RESEND_API_KEY

# Check logs
pm2 logs movo | grep -i email

# Verify Resend account
# Go to https://resend.com/emails
```

## Reset link not working
```bash
# Check token generation
# Verify token is in URL
# Check if token is expired (30 minutes)
```

## Password not updating
```bash
# Check database
# Verify user exists
# Check bcrypt hashing
```

---

**Ready to implement!**

