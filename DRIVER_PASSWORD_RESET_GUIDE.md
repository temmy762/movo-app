# Movo Privé Driver Password Reset - Complete Guide

## 🔐 Overview

The driver password reset system allows chauffeurs to securely reset their forgotten passwords through an email-based verification flow.

---

## 🔄 Complete Password Reset Flow

```
┌─────────────────────────────────────────────────────────┐
│                 PASSWORD RESET FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. DRIVER VISITS LOGIN PAGE                           │
│     └─→ /driver/onboarding/login                       │
│                                                         │
│  2. CLICKS "FORGOT PASSWORD?"                          │
│     └─→ Redirects to /driver/onboarding/forgot-password│
│                                                         │
│  3. ENTERS EMAIL ADDRESS                               │
│     └─→ Validates email format                         │
│     └─→ Checks if driver account exists                │
│                                                         │
│  4. CLICKS "SEND RESET LINK"                           │
│     └─→ API: POST /api/auth/driver/forgot-password     │
│     └─→ Generates reset token (32-byte random)         │
│     └─→ Token expires in 30 minutes                    │
│     └─→ Sends email with reset link                    │
│                                                         │
│  5. RECEIVES EMAIL                                      │
│     └─→ Subject: Password Reset - Movo Privé           │
│     └─→ Contains reset link with token                 │
│     └─→ Link: /driver/onboarding/reset-password?token=X│
│                                                         │
│  6. CLICKS RESET LINK IN EMAIL                         │
│     └─→ Redirects to /driver/onboarding/reset-password │
│     └─→ Token is validated                             │
│     └─→ Checks if token is expired                     │
│                                                         │
│  7. ENTERS NEW PASSWORD                                │
│     └─→ Minimum 6 characters                           │
│     └─→ Must confirm password (match)                  │
│     └─→ Can toggle visibility                          │
│                                                         │
│  8. CLICKS "RESET PASSWORD"                            │
│     └─→ API: POST /api/auth/driver/reset-password      │
│     └─→ Validates token again                          │
│     └─→ Hashes new password with bcrypt                │
│     └─→ Updates driver password in database            │
│     └─→ Deletes reset token (one-time use)             │
│                                                         │
│  9. SUCCESS MESSAGE                                     │
│     └─→ Shows confirmation                             │
│     └─→ Auto-redirects to login (2 seconds)            │
│                                                         │
│  10. LOGS IN WITH NEW PASSWORD                         │
│      └─→ /driver/onboarding/login                      │
│      └─→ Enters email & new password                   │
│      └─→ Successfully logs in                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📄 Frontend Pages

### 1. **Forgot Password Page**
**URL:** `/driver/onboarding/forgot-password`

**File:** `app/driver/onboarding/forgot-password/page.tsx`

**Features:**
- Email input field with validation
- "Send Reset Link" button
- Error messages for invalid emails
- Success message after submission
- "Send Another Email" option
- "Back to Login" link

**User Flow:**
1. Enter email address
2. Click "Send Reset Link"
3. See success message
4. Check email for reset link

**Validation:**
- Email is required
- Email format must be valid (xxx@xxx.xxx)
- Account must exist (silent success for security)

---

### 2. **Reset Password Page**
**URL:** `/driver/onboarding/reset-password?token=<TOKEN>`

**File:** `app/driver/onboarding/reset-password/page.tsx`

**Features:**
- New password input with visibility toggle
- Confirm password input with visibility toggle
- Password strength indicator (minimum 6 characters)
- "Reset Password" button
- Error messages for validation failures
- Success message with auto-redirect
- "Back to Login" link

**User Flow:**
1. Receive email with reset link
2. Click link (token in URL)
3. Enter new password
4. Confirm password
5. Click "Reset Password"
6. See success message
7. Auto-redirect to login

**Validation:**
- Token must be present in URL
- Token must be valid (exists in database)
- Token must not be expired (30-minute window)
- Password must be at least 6 characters
- Passwords must match
- Password must be different from old password (optional)

---

## 🔌 Backend API Endpoints

### 1. **Forgot Password Endpoint**
**URL:** `/api/auth/driver/forgot-password`
**Method:** `POST`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (Success):**
```json
{
  "success": true
}
```

**Response (Error):**
```json
{
  "error": "Email is required"
}
```

**What It Does:**
1. Validates email is provided
2. Looks up driver by email
3. If driver exists:
   - Generates 32-byte random token
   - Sets expiration to 30 minutes from now
   - Creates PasswordResetToken record
   - Sends email with reset link
4. Returns success (always, for security)

**Database Changes:**
- Creates `PasswordResetToken` record
- Fields: `email`, `token`, `expiresAt`

**Email Sent:**
- Event type: `CHAUFFEUR_PASSWORD_RESET`
- Recipient: Driver email
- Contains: Reset link with token

---

### 2. **Reset Password Endpoint**
**URL:** `/api/auth/driver/reset-password`
**Method:** `POST`

**Request Body:**
```json
{
  "token": "abc123def456...",
  "password": "newpassword123"
}
```

**Response (Success):**
```json
{
  "success": true
}
```

**Response (Error):**
```json
{
  "error": "Token expired"
}
```

**Error Cases:**
- `"Token and password are required"` (400)
- `"Password must be at least 6 characters"` (400)
- `"Invalid or expired token"` (400)
- `"Token expired"` (400)

**What It Does:**
1. Validates token and password are provided
2. Validates password length (minimum 6)
3. Looks up reset token
4. If not found: Returns error
5. If expired: Deletes token and returns error
6. If valid:
   - Hashes password with bcrypt (10 rounds)
   - Updates driver password
   - Deletes reset token (one-time use)
   - Returns success

**Database Changes:**
- Updates `Driver.password` (hashed)
- Deletes `PasswordResetToken` record

---

## 🔒 Security Features

### Token Generation
- **Length:** 32 bytes (64 hex characters)
- **Method:** `crypto.randomBytes(32).toString("hex")`
- **Uniqueness:** Cryptographically random
- **Collision Risk:** Negligible

### Token Expiration
- **Duration:** 30 minutes
- **Enforcement:** Checked on reset attempt
- **Cleanup:** Token deleted after use or expiration

### Password Security
- **Hashing:** bcrypt with 10 rounds
- **Storage:** Never stored in plain text
- **Comparison:** Secure comparison (bcrypt)

### Email Verification
- **One-time Use:** Token deleted after use
- **No Reuse:** Same token cannot be used twice
- **Expiration:** Token becomes invalid after 30 minutes

### Silent Failures
- **Non-existent Email:** Returns success (prevents email enumeration)
- **No Account Info:** Error messages don't reveal if account exists

---

## 📧 Email Template

**Subject:** Password Reset - Movo Privé

**Content:**
```
Dear [Driver Name],

We received a request to reset your Movo Privé password.

Click the link below to reset your password:
[Reset Link with Token]

This link will expire in 30 minutes.

If you didn't request this, please ignore this email.

Best regards,
The Movo Privé Team
```

**Sent Via:** Resend (email service)

---

## 🧪 Testing the Flow

### Manual Testing

**Step 1: Request Password Reset**
```bash
curl -X POST http://localhost:3000/api/auth/driver/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@example.com"}'
```

**Step 2: Check Email**
- Look for email from Movo Privé
- Copy reset link with token

**Step 3: Reset Password**
```bash
curl -X POST http://localhost:3000/api/auth/driver/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<TOKEN>","password":"newpassword123"}'
```

**Step 4: Login with New Password**
- Visit `/driver/onboarding/login`
- Enter email and new password
- Should successfully log in

### Edge Cases to Test

1. **Invalid Email Format**
   - Input: `notanemail`
   - Expected: Error message

2. **Non-existent Email**
   - Input: `nonexistent@example.com`
   - Expected: Success message (silent failure)

3. **Expired Token**
   - Wait 30+ minutes after requesting reset
   - Try to use token
   - Expected: "Token expired" error

4. **Invalid Token**
   - Use random token string
   - Expected: "Invalid or expired token" error

5. **Password Too Short**
   - Input: `12345` (5 characters)
   - Expected: "Password must be at least 6 characters"

6. **Passwords Don't Match**
   - Password: `password123`
   - Confirm: `password456`
   - Expected: "Passwords do not match" error

7. **Token Reuse**
   - Use same token twice
   - Expected: Second attempt fails (token deleted after first use)

---

## 🔧 Configuration

### Environment Variables
```
NEXT_PUBLIC_BASE_URL=https://movoprive.com
RESEND_API_KEY=your_resend_api_key
```

### Token Expiration
- **Current:** 30 minutes
- **Location:** `app/api/auth/driver/forgot-password/route.ts` line 26
- **To Change:** Update `30 * 60 * 1000` (milliseconds)

### Password Requirements
- **Current:** Minimum 6 characters
- **Location:** Both frontend and backend validation
- **To Change:** Update validation in both files

---

## 📊 Database Schema

### PasswordResetToken Table
```prisma
model PasswordResetToken {
  email     String    @id
  token     String    @unique
  expiresAt DateTime
  createdAt DateTime  @default(now())
}
```

**Fields:**
- `email`: Driver's email (primary key)
- `token`: Reset token (unique, 64 hex characters)
- `expiresAt`: Expiration timestamp
- `createdAt`: Creation timestamp

---

## 🚨 Error Handling

### Frontend Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Email is required" | Empty email field | Enter email address |
| "Please enter a valid email address" | Invalid format | Use format: xxx@xxx.xxx |
| "Network error" | Connection issue | Check internet connection |
| "Invalid or expired token" | Bad/expired token | Request new reset link |
| "Token expired" | Token older than 30 min | Request new reset link |
| "Password must be at least 6 characters" | Too short | Use 6+ characters |
| "Passwords do not match" | Mismatch | Confirm password matches |

### Backend Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Email is required" | Missing email field |
| 400 | "Token and password are required" | Missing fields |
| 400 | "Password must be at least 6 characters" | Short password |
| 400 | "Invalid or expired token" | Token not found |
| 400 | "Token expired" | Token older than 30 min |
| 500 | "Failed to process request" | Server error |

---

## 📱 User Experience

### Happy Path (Success)
1. Driver clicks "Forgot password?" ✓
2. Enters email ✓
3. Receives email with link ✓
4. Clicks link ✓
5. Enters new password ✓
6. Confirms password ✓
7. Clicks "Reset Password" ✓
8. Sees success message ✓
9. Auto-redirects to login ✓
10. Logs in with new password ✓

**Time:** ~2-3 minutes

### Error Recovery
- Clear error messages guide user
- Can request new link if expired
- Can go back to login anytime
- No account lockout

---

## 🔄 Integration Points

### With Login System
- After reset, driver uses new password to login
- Login validates against hashed password
- Session created on successful login

### With Email System
- Uses Resend for email delivery
- Event type: `CHAUFFEUR_PASSWORD_RESET`
- Includes reset link with token

### With Database
- Stores reset tokens temporarily
- Updates driver password hash
- Cleans up expired tokens

---

## 📋 Checklist for Deployment

- [ ] Environment variables configured
- [ ] Resend API key set
- [ ] Base URL correct
- [ ] Email templates tested
- [ ] Password reset flow tested
- [ ] Token expiration working
- [ ] Database migrations applied
- [ ] Error handling verified
- [ ] Security review completed
- [ ] Load testing done

---

## 🎯 Summary

The driver password reset system provides:

✅ **Secure Token Generation** - Cryptographically random tokens
✅ **Time-Limited Access** - 30-minute expiration
✅ **One-Time Use** - Tokens deleted after use
✅ **Email Verification** - Reset link sent via email
✅ **Password Hashing** - bcrypt with 10 rounds
✅ **User-Friendly UI** - Clear instructions and error messages
✅ **Security Best Practices** - Silent failures, no email enumeration
✅ **Error Recovery** - Easy to request new link if expired

All implemented and ready to use! 🚀
