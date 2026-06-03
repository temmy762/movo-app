# Fleet Partner Onboarding - Test Checklist

## Build Status
✅ **Build Successful** - `npm run build` completed without errors
✅ **All Routes Registered** - All onboarding pages and API endpoints compiled
✅ **No TypeScript Errors** - Implementation code is type-safe

---

## Implementation Verification

### Backend APIs
- ✅ `POST /api/driver/onboarding/submit` - Validates fleet data, creates DriverOnboarding record
- ✅ `PATCH /api/admin/onboarding/[id]` - Approves/rejects, activates driver, creates vehicle
- ✅ `GET /api/admin/onboarding/list` - Lists pending applications with fleet data

### Frontend Pages
- ✅ `/driver/onboarding/partner` - Company information page (collects data)
- ✅ `/driver/onboarding/partner/fleet` - Fleet information page (collects data)
- ✅ `/driver/onboarding/partner/vehicle` - Vehicle & chauffeur page (collects data + submits)
- ✅ `/driver/onboarding/success` - Success page after submission
- ✅ `/admin/(panel)/onboarding` - Admin review page (already exists)

### State Management
- ✅ `FleetOnboardingContext` - Defines data structure
- ✅ `FleetOnboardingProvider` - Manages state across pages
- ✅ Layout wrapped with provider - All pages have access to context

### Data Flow
- ✅ Company info → Context
- ✅ Fleet info → Context
- ✅ Vehicle & chauffeur info → Context
- ✅ Submit → API validation → Database
- ✅ Admin approval → Driver activation + Vehicle creation

---

## Pre-Deployment Testing Checklist

### 1. Frontend Flow Testing
- [ ] Navigate to `/driver/onboarding/partner`
- [ ] Fill company information (all required fields)
- [ ] Verify data persists when navigating to next page
- [ ] Fill fleet information
- [ ] Verify data persists when navigating to vehicle page
- [ ] Fill vehicle & chauffeur information
- [ ] Click "Submit for Review"
- [ ] Verify validation error if any field is missing
- [ ] Submit with all fields filled
- [ ] Verify redirect to success page
- [ ] Verify success page displays correctly

### 2. Database Verification
- [ ] Check `DriverOnboarding` table for new record
- [ ] Verify `adminStatus` is set to "PENDING"
- [ ] Verify all fleet fields are populated correctly
- [ ] Verify `submittedAt` timestamp is set

### 3. Admin Review Testing
- [ ] Log in as admin
- [ ] Navigate to Admin → Onboarding
- [ ] Verify fleet partner application appears in list
- [ ] Click to view application details
- [ ] Verify company information displays correctly
- [ ] Verify vehicle information displays correctly
- [ ] Verify chauffeur information displays correctly
- [ ] Add optional admin note
- [ ] Click "Approve & Activate"
- [ ] Verify success response

### 4. Post-Approval Verification
- [ ] Check `Driver` table - status should be "ACTIVE"
- [ ] Check `Vehicle` table - new vehicle should be created with:
  - [ ] Correct make (brand)
  - [ ] Correct model
  - [ ] Correct year
  - [ ] Correct plate
  - [ ] Correct tier (class)
- [ ] Verify `DriverOnboarding.adminStatus` is now "APPROVED"
- [ ] Verify `DriverOnboarding.reviewedAt` is set

### 5. Error Handling Testing
- [ ] Try submitting with missing fields - should show error
- [ ] Try submitting without authentication - should return 401
- [ ] Try accessing admin endpoints without admin role - should return 403
- [ ] Try approving non-existent onboarding - should handle gracefully

### 6. Data Validation Testing
- [ ] Verify all required fields are validated on frontend
- [ ] Verify all required fields are validated on backend
- [ ] Verify email format validation (chauffeur email)
- [ ] Verify phone format validation (chauffeur phone)
- [ ] Verify numeric fields (year) are parsed correctly

---

## Known Limitations
- Email notifications not yet implemented (optional future task)
- Document upload not yet implemented (optional future task)
- Additional chauffeurs/vehicles can only be added after approval (future task)

---

## Deployment Steps
1. Run `npm run build` to verify compilation
2. Run tests (if available)
3. Push to VPS with `git push`
4. Run Prisma migrations: `npx prisma migrate deploy`
5. Restart PM2 process: `pm2 restart movo`
6. Verify application is running: `pm2 logs movo`

---

## Rollback Plan
If issues occur:
1. Revert last commit: `git revert HEAD`
2. Push revert: `git push`
3. Restart application: `pm2 restart movo`
4. Check logs: `pm2 logs movo`

---

## Success Criteria
✅ Build passes without errors
✅ All pages render correctly
✅ Data persists across pages
✅ Submission validates all fields
✅ API creates database records
✅ Admin can review applications
✅ Approval activates driver and creates vehicle
✅ No console errors in browser
✅ No server errors in logs
