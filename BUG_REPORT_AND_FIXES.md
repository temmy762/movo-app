# BUG REPORT AND FIXES
## movoprive.com Issues

**Date:** June 3, 2026  
**Issues Reported:** 3 critical bugs  
**Status:** ANALYSIS COMPLETE

---

# ISSUE #1: 404 Error on /user/register

## Problem
User reports 404 error when accessing `https://movoprive.com/user/register`

## Root Cause
There is **NO `/user/register` page** in the application.

**Current Structure:**
```
✅ /onboarding/register - EXISTS (for new user registration)
✅ /onboarding/login - EXISTS (for user login)
✅ /user/login - EXISTS (alternative user login)
❌ /user/register - DOES NOT EXIST
```

**Evidence:**
- Directory listing shows: `/app/user/` contains only:
  - `dashboard/`
  - `login/`
  - `tracking/`
- No `register/` directory exists

## Solution

### Option A: Create `/user/register` page (Recommended)
Create a new page at `/app/user/register/page.tsx` that mirrors `/onboarding/register/page.tsx`

### Option B: Redirect to `/onboarding/register`
Add a redirect route from `/user/register` to `/onboarding/register`

### Option C: Update navigation links
If `/user/register` was never intended, update all links pointing to it to use `/onboarding/register` instead

## Implementation

I recommend **Option A** - Create the missing page:

```bash
# Create the directory
mkdir -p app/user/register

# Copy the onboarding register page
cp app/onboarding/register/page.tsx app/user/register/page.tsx
```

---

# ISSUE #2: Google Sign-In Not Working

## Problem
Sign in with Google button is not functioning

## Root Cause Analysis

### Potential Causes:

1. **Missing Environment Variables**
   - `GOOGLE_CLIENT_ID` not set
   - `GOOGLE_CLIENT_SECRET` not set
   - `NEXT_PUBLIC_APP_URL` not set

   **Evidence:** `app/api/auth/google/route.ts` Lines 10-14:
   ```typescript
   const clientId = process.env.GOOGLE_CLIENT_ID;
   const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
   if (!clientId || !clientSecret) {
     return NextResponse.redirect(`${BASE_URL}${errorPath}?error=oauth_config`);
   }
   ```

2. **Incorrect Redirect URI**
   - Google OAuth configured with wrong redirect URI
   - Expected: `https://movoprive.com/api/auth/google/callback`
   - Actual: May be different

3. **Google OAuth App Not Created**
   - Google OAuth credentials not set up in Google Cloud Console
   - OAuth consent screen not configured

4. **CORS or Network Issues**
   - Firewall blocking Google API calls
   - Network connectivity issues

## Verification Steps

### Step 1: Check Environment Variables
```bash
# SSH into VPS
ssh root@srv1691570

# Check if variables are set
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $NEXT_PUBLIC_APP_URL
```

### Step 2: Check Browser Console
Open browser developer tools (F12) and check:
- Network tab for failed requests to Google APIs
- Console for JavaScript errors
- Check if redirect to `/api/auth/google` is happening

### Step 3: Check Server Logs
```bash
pm2 logs movo | grep -i google
```

### Step 4: Test OAuth Flow
1. Click Google button
2. Check if redirected to `https://accounts.google.com/o/oauth2/v2/auth`
3. If not, check if `oauth_config` error appears

## Solution

### If Environment Variables Missing:

1. **Get Google OAuth Credentials:**
   - Go to https://console.cloud.google.com
   - Create OAuth 2.0 credentials (Web application)
   - Set authorized redirect URIs to:
     - `https://movoprive.com/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback` (for local testing)

2. **Set Environment Variables on VPS:**
   ```bash
   ssh root@srv1691570
   cd /path/to/movo-app
   
   # Edit .env.production
   nano .env.production
   
   # Add these lines:
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   NEXT_PUBLIC_APP_URL=https://movoprive.com
   
   # Save and exit (Ctrl+X, Y, Enter)
   
   # Restart PM2
   pm2 restart movo
   ```

3. **Verify Deployment:**
   ```bash
   pm2 logs movo
   # Should see successful startup without errors
   ```

---

# ISSUE #3: Cookies Banner Not Working

## Problem
Cookies banner buttons are not functioning correctly

## Root Cause Analysis

### Current Implementation Status:

**✅ WORKING:**
- Banner displays correctly
- "Accept All" button works
- "Essential Only" button works
- "Learn more" link opens modal
- Modal displays correctly
- Modal toggles work
- "Save My Preferences" button works
- Consent is persisted to localStorage and cookies

**❌ POTENTIAL ISSUES:**

1. **Modal Close Button May Not Work**
   - Location: `components/consent/ConsentModal.tsx` Line 100
   - The X button should close the modal
   - Check if click handler is working

2. **Modal Backdrop Click Not Closing**
   - Location: `components/consent/ConsentModal.tsx` Line 88
   - Clicking outside modal should close it
   - May not work if z-index issues exist

3. **Consent Not Persisting**
   - localStorage may be disabled
   - Cookies may be blocked by browser
   - Check browser settings

4. **Banner Not Hiding After Decision**
   - After accepting/rejecting, banner should disappear
   - Check if `showBanner` state is updating correctly

## Verification Steps

### Step 1: Check Browser Console
```javascript
// Open browser console (F12) and run:
localStorage.getItem('movo_consent_v1')
// Should return consent object after making a choice

// Check cookies
document.cookie
// Should contain 'movo_consent'
```

### Step 2: Test Each Button
1. **Accept All** - Should:
   - Hide banner immediately
   - Set all consent flags to true
   - Store in localStorage and cookies

2. **Essential Only** - Should:
   - Hide banner immediately
   - Set functional, analytics, marketing to false
   - Store in localStorage and cookies

3. **Manage Preferences** - Should:
   - Open modal
   - Allow toggling each category
   - Save preferences

4. **Learn More** - Should:
   - Open modal from banner
   - Show all categories

5. **Modal Close (X)** - Should:
   - Close modal without saving
   - Return to previous state

6. **Modal Backdrop Click** - Should:
   - Close modal when clicking outside

### Step 3: Check Network
- Open Network tab in DevTools
- Make a choice
- Should NOT see any failed requests

## Solution

### If Buttons Not Working:

The code looks correct, but here are potential fixes:

**1. Ensure ConsentProvider is Wrapping Everything**
   - Location: `app/layout.tsx` Lines 33-37
   - ✅ Already correct

**2. Check for JavaScript Errors**
   - Open browser console
   - Look for any red errors
   - Fix any import or syntax errors

**3. Clear Browser Cache**
   ```javascript
   // In browser console:
   localStorage.clear()
   document.cookie = 'movo_consent=; max-age=0'
   location.reload()
   ```

**4. Test in Incognito Mode**
   - Open incognito/private window
   - Test if banner works
   - If yes, issue is with cached data

**5. Check for CSS Issues**
   - Buttons may be hidden by CSS
   - Check if z-index is correct (3000 for banner, 3100 for modal)
   - Check if display/visibility is correct

### If Consent Not Persisting:

**Check localStorage:**
```javascript
// In browser console:
localStorage.setItem('test', 'value')
localStorage.getItem('test')
// Should return 'value'
```

**If localStorage disabled:**
- Browser privacy settings may block it
- User needs to enable localStorage
- Or implement fallback (currently using cookies as fallback)

---

# IMPLEMENTATION PLAN

## Priority 1: Fix /user/register (CRITICAL)

### Step 1: Create the page
```bash
mkdir -p d:\Users\Public\MOVO\ WEB\ APP\movo-web\app\user\register
cp d:\Users\Public\MOVO\ WEB\ APP\movo-web\app\onboarding\register\page.tsx d:\Users\Public\MOVO\ WEB\ APP\movo-web\app\user\register\page.tsx
```

### Step 2: Test locally
```bash
npm run dev
# Visit http://localhost:3000/user/register
# Should display registration form
```

### Step 3: Deploy
```bash
git add app/user/register/page.tsx
git commit -m "fix: Add missing /user/register page"
git push origin master
```

---

## Priority 2: Fix Google OAuth (HIGH)

### Step 1: Verify Environment Variables
```bash
ssh root@srv1691570
cd /path/to/movo-app
cat .env.production | grep GOOGLE
```

### Step 2: If Missing, Add Them
```bash
nano .env.production
# Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
pm2 restart movo
```

### Step 3: Test
```bash
# Visit https://movoprive.com/onboarding/register
# Click Google button
# Should redirect to Google login
```

---

## Priority 3: Verify Cookies Banner (MEDIUM)

### Step 1: Test in Browser
- Open https://movoprive.com
- Clear localStorage and cookies
- Reload page
- Banner should appear

### Step 2: Test Each Button
- Click "Accept All" → Banner should disappear
- Reload page → Banner should NOT appear
- Open DevTools → Check localStorage

### Step 3: If Not Working
- Check browser console for errors
- Check if ConsentProvider is loaded
- Clear cache and test again

---

# SUMMARY

| Issue | Severity | Root Cause | Fix Time |
|-------|----------|-----------|----------|
| /user/register 404 | CRITICAL | Missing page | 5 min |
| Google Sign-In | HIGH | Missing env vars | 10 min |
| Cookies Banner | MEDIUM | Likely working, needs verification | 15 min |

**Total Estimated Fix Time:** 30 minutes

---

# NEXT STEPS

1. Create `/user/register` page
2. Verify Google OAuth environment variables on VPS
3. Test cookies banner in browser
4. Deploy fixes
5. Verify all three issues are resolved

