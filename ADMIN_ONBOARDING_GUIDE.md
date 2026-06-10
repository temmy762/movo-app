# Movo Privé Admin Onboarding Management - Complete Guide

## 👨‍💼 Admin Dashboard Overview

**URL:** `https://movoprive.com/admin/onboarding`

The admin onboarding page allows the Movo team to review, approve, and manage chauffeur applications.

---

## 📋 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                 CHAUFFEUR ONBOARDING                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FILTERS:                                                   │
│  [Status: All ▼] [Type: All ▼]                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ APPLICATIONS LIST                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │ [JS] John Smith          PENDING    Individual      │   │
│  │      john@email.com      Submitted: Jun 10, 2026   │   │
│  │                                                     │   │
│  │ [SM] Sarah Miller        APPROVED   Fleet          │   │
│  │      sarah@email.com     Approved: Jun 8, 2026     │   │
│  │                                                     │   │
│  │ [MJ] Mike Johnson        REJECTED   Individual      │   │
│  │      mike@email.com      Rejected: Jun 5, 2026     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DETAILED VIEW (when selected)                       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │ APPLICANT INFORMATION                              │   │
│  │ Name: John Smith                                    │   │
│  │ Email: john@email.com                              │   │
│  │ Phone: (204) 555-1234                              │   │
│  │ Type: Individual Chauffeur                         │   │
│  │ Status: PENDING                                     │   │
│  │ Submitted: June 10, 2026 at 2:45 PM               │   │
│  │                                                     │   │
│  │ PERSONAL DETAILS                                    │   │
│  │ Date of Birth: 1990-05-15                          │   │
│  │ Driver's License: DL-123456                        │   │
│  │                                                     │   │
│  │ VEHICLE INFORMATION                                │   │
│  │ Make: Toyota                                        │   │
│  │ Model: Prius                                        │   │
│  │ Year: 2022                                          │   │
│  │ Plate: ABC-123                                      │   │
│  │ Tier: Economy                                       │   │
│  │                                                     │   │
│  │ DOCUMENTS                                           │   │
│  │ ✓ Profile Photo          [APPROVED]                │   │
│  │ ✓ Driver's License       [APPROVED]                │   │
│  │ ⏳ Background Check      [PENDING]                 │   │
│  │ ✗ Vehicle Registration   [REJECTED]                │   │
│  │ ✓ Vehicle Insurance      [APPROVED]                │   │
│  │                                                     │   │
│  │ CONSENTS & AGREEMENTS                              │   │
│  │ ✓ GPS Tracking Consent   Jun 10, 2026             │   │
│  │ ✓ Privacy Policy         Jun 10, 2026             │   │
│  │ ✓ Legal Notice           Jun 10, 2026             │   │
│  │ ✓ Terms & Conditions     Jun 10, 2026             │   │
│  │ ✓ Contract Signed        Jun 10, 2026             │   │
│  │                                                     │   │
│  │ BANKING INFORMATION                                │   │
│  │ Account Name: John Smith                           │   │
│  │ Institution: Royal Bank of Canada                  │   │
│  │ Account Number: ••••••••1234                       │   │
│  │                                                     │   │
│  │ ADMIN REVIEW                                        │   │
│  │ Status: PENDING                                     │   │
│  │ Reviewed By: —                                      │   │
│  │ Reviewed At: —                                      │   │
│  │                                                     │   │
│  │ ADMIN NOTES:                                        │   │
│  │ [Text area for notes...]                           │   │
│  │                                                     │   │
│  │ [APPROVE] [REJECT] [UNDER REVIEW]                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Filtering Applications

### Status Filter
```
[All Status ▼]
├─ All Status       (shows all applications)
├─ Pending          (awaiting review)
├─ Under Review     (currently being reviewed)
├─ Approved         (approved and active)
└─ Rejected         (rejected applications)
```

### Type Filter
```
[All Types ▼]
├─ All Types        (both individual and fleet)
├─ Individual       (single chauffeur)
└─ Fleet            (fleet partner company)
```

### Combined Filtering
```
Example: Show all pending individual applications
[Status: Pending ▼] [Type: Individual ▼]
```

---

## 📊 Application List View

### Information Displayed

**For Each Application:**
```
[INITIALS] Full Name              STATUS        TYPE
           Email Address          Date Info
```

**Example:**
```
[JS] John Smith                   PENDING       Individual
     john@email.com               Submitted: Jun 10, 2026

[SM] Sarah Miller                 APPROVED      Fleet
     sarah@email.com              Approved: Jun 8, 2026

[MJ] Mike Johnson                 REJECTED      Individual
     mike@email.com               Rejected: Jun 5, 2026
```

### Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| PENDING | Yellow | Awaiting admin review |
| UNDER_REVIEW | Blue | Currently being reviewed |
| APPROVED | Green | Approved and driver activated |
| REJECTED | Red | Application rejected |

### Sorting
- Default: Newest first (by submission date)
- Click column headers to sort
- Reverse sort available

---

## 🔎 Detailed Review View

Click on any application to view full details.

### Section 1: Applicant Information

**Basic Details:**
- Full Name
- Email Address
- Phone Number
- Application Type (Individual/Fleet)
- Current Status
- Submission Date & Time

**Purpose:** Quick identification and contact info

---

### Section 2: Personal Details (Individual)

**Collected Information:**
- Date of Birth
- Driver's License Number
- Country
- City

**Purpose:** Verify driver identity and eligibility

---

### Section 3: Company Details (Fleet)

**Collected Information:**
- Company Name
- Legal Form (LLC, Corporation, etc.)
- Tax ID
- VAT ID
- Registration Number
- Fleet Size
- Vehicle Descriptions

**Purpose:** Verify company legitimacy and structure

---

### Section 4: Vehicle Information

**Individual Chauffeur:**
- Make (Toyota, Honda, etc.)
- Model (Prius, Civic, etc.)
- Year (2022, 2023, etc.)
- License Plate
- Tier/Class (Economy, Premium, etc.)
- Color

**Fleet Partner (First Vehicle):**
- Same as above
- Plus: VIN (Vehicle Identification Number)

**Purpose:** Verify vehicle eligibility and details

---

### Section 5: Documents

**Individual Chauffeur Documents:**
- Profile Photo
- Driver's License
- Background Check
- Driver's Abstract
- Work Eligibility
- Vehicle Registration
- Vehicle Insurance
- Vehicle Photos

**Fleet Partner Documents:**
- Same as above
- Plus: Company registration documents
- Plus: Insurance certificates

**Document Status:**
```
✓ APPROVED    - Document verified and accepted
⏳ PENDING    - Awaiting admin review
✗ REJECTED    - Document rejected, resubmission needed
```

**Admin Actions on Documents:**
- Click to view full document
- Approve individual document
- Reject with reason
- Request resubmission

---

### Section 6: Consents & Agreements

**All Applicants Must Accept:**
- ✓ GPS Tracking Consent
- ✓ Privacy Policy
- ✓ Legal Notice
- ✓ Terms & Conditions
- ✓ Contract Signature

**Displayed Information:**
- Checkbox status (✓ or ✗)
- Date accepted (if accepted)

**Purpose:** Ensure legal compliance

---

### Section 7: Banking Information

**Collected Details:**
- Account Holder Name
- Bank/Institution Name
- Account Number (masked: ••••••••1234)
- Routing Number (if applicable)

**Purpose:** Verify payout information

**Security Note:** Account numbers are partially masked for security

---

### Section 8: Admin Review Section

**Current Status:**
- Status: PENDING / UNDER_REVIEW / APPROVED / REJECTED
- Reviewed By: Admin name (if reviewed)
- Reviewed At: Date & time (if reviewed)

**Admin Notes:**
- Text area for admin comments
- Visible to other admins
- Included in approval/rejection email

**Example Notes:**
```
"Background check passed. Vehicle registration verified. 
Ready for approval. All documents in order."
```

---

## ✅ Approval Process

### Step 1: Review Application
1. Click on application in list
2. Review all sections
3. Check all documents
4. Verify consents

### Step 2: Verify Documents
- Ensure all required documents are present
- Check document status
- Request resubmission if needed
- Approve individual documents

### Step 3: Add Admin Notes (Optional)
```
[Admin Notes Text Area]

Example:
"All documents verified. Background check clear. 
Driver has 5+ years experience. Ready to activate."
```

### Step 4: Click APPROVE Button

**What Happens Automatically:**
```
1. Updates DriverOnboarding record:
   ├─ adminStatus: "PENDING" → "APPROVED"
   ├─ reviewedAt: current timestamp
   ├─ reviewedBy: admin name
   └─ adminNote: saved notes

2. Activates Driver Account:
   ├─ driver.status: "PENDING" → "ACTIVE"
   └─ driver.onboardingType: set to INDIVIDUAL/FLEET

3. For Fleet Partners:
   └─ Creates Vehicle record with first vehicle info

4. Sends Notifications:
   ├─ Email to driver: "Application Approved!"
   ├─ Admin dashboard: Updated status
   └─ System log: Approval recorded
```

**Driver Receives:**
- Approval email
- Instructions to log in
- Welcome to dashboard message

---

## ❌ Rejection Process

### Step 1: Review Application
1. Click on application
2. Identify issues
3. Document reasons

### Step 2: Add Rejection Notes
```
[Admin Notes Text Area]

Example:
"Background check shows traffic violations. 
Vehicle insurance expired. Please reapply with updated documents."
```

### Step 3: Click REJECT Button

**What Happens Automatically:**
```
1. Updates DriverOnboarding record:
   ├─ adminStatus: "PENDING" → "REJECTED"
   ├─ reviewedAt: current timestamp
   ├─ reviewedBy: admin name
   └─ adminNote: rejection reason

2. Sends Notification:
   ├─ Email to driver: "Application Status Update"
   ├─ Includes rejection reason
   ├─ Provides reapplication instructions
   └─ Support contact info

3. Driver Status:
   └─ driver.status: remains "PENDING" (cannot go online)
```

**Driver Receives:**
- Rejection email with reasons
- Instructions to reapply
- Support contact information

---

## 🔄 Under Review Status

### When to Use
- Application is being reviewed
- Waiting for additional information
- Pending background check results
- Verifying documents

### Step 1: Click UNDER REVIEW Button

**What Happens:**
```
1. Updates DriverOnboarding:
   ├─ adminStatus: "PENDING" → "UNDER_REVIEW"
   ├─ reviewedAt: current timestamp
   └─ reviewedBy: admin name

2. Driver Notification:
   └─ Email: "Your application is under review"

3. Application Status:
   └─ Visible in admin dashboard as "UNDER_REVIEW"
```

### Step 2: Continue Review
- Request additional documents
- Wait for background check
- Verify information
- Add notes as needed

### Step 3: Final Decision
- Click APPROVE or REJECT
- Application moves to final status

---

## 📧 Email Notifications

### Admin Receives:
- New application submitted
- Document uploaded
- Application resubmitted

### Driver Receives:

**On Submission:**
```
Subject: Onboarding Application Submitted - Movo Privé

Dear John,

We have received your chauffeur onboarding application.

What happens next:
• Our team will review your information and documents
• We'll verify your details and registration
• You'll receive an email notification with the decision
• This typically takes 1-3 business days

If you have any questions, contact support@movoprive.com

Best regards,
The Movo Privé Team
```

**On Approval:**
```
Subject: Congratulations! Your Application is Approved

Dear John,

Great news! Your Movo Privé onboarding application has been APPROVED.

Your account is now active and ready to use.

Next steps:
1. Log in at movoprive.com/driver/login
2. Go to your dashboard
3. Go online to start accepting rides
4. Begin earning!

If you have any questions, contact support@movoprive.com

Welcome to Movo Privé!
```

**On Rejection:**
```
Subject: Application Status Update - Movo Privé

Dear John,

Thank you for your application to Movo Privé.

Unfortunately, we are unable to approve your application at this time.

Reason: Background check shows traffic violations

What you can do:
• Address the issues mentioned above
• Reapply with updated documents
• Contact support for guidance

We appreciate your interest in joining Movo Privé.

Best regards,
The Movo Privé Team
```

---

## 📊 Admin Dashboard Statistics

### Visible on Main Admin Dashboard

**Onboarding Metrics:**
- Total applications received
- Pending applications
- Approved drivers
- Rejected applications
- Approval rate

**Displayed as:**
- Cards with numbers
- Trend indicators (↑ ↓)
- Percentage changes

---

## 🔐 Admin Permissions

### Required Role
- Must be logged in as ADMIN
- Only admins can access `/admin/onboarding`
- Only admins can approve/reject applications

### Actions Available
- ✅ View all applications
- ✅ Filter by status and type
- ✅ View detailed information
- ✅ Approve applications
- ✅ Reject applications
- ✅ Mark as under review
- ✅ Add admin notes
- ✅ Approve/reject documents

### Actions NOT Available
- ❌ Delete applications
- ❌ Edit driver information
- ❌ Modify submitted data
- ❌ Bypass approval process

---

## 🚨 Common Issues & Solutions

### Issue: Application Not Appearing
**Solution:**
1. Check filter status (should include "PENDING")
2. Check filter type (should include applicant type)
3. Verify application was submitted (check submittedAt field)
4. Check database for DriverOnboarding record

### Issue: Approval Not Working
**Solution:**
1. Verify you are logged in as ADMIN
2. Check that onboarding ID is correct
3. Ensure driver record exists
4. Check browser console for errors
5. Try refreshing page

### Issue: Driver Cannot Login After Approval
**Solution:**
1. Verify driver.status is "ACTIVE"
2. Verify onboarding.adminStatus is "APPROVED"
3. Check email for login credentials
4. Verify driver account exists
5. Check session/cookie settings

### Issue: Documents Not Uploading
**Solution:**
1. Check file size (should be < 10MB)
2. Check file format (PDF, JPG, PNG)
3. Check internet connection
4. Try different browser
5. Clear cache and retry

---

## 📋 Checklist for Approval

Before approving an application, verify:

**Personal Information:**
- ✓ Full name provided
- ✓ Valid email address
- ✓ Valid phone number
- ✓ Age appropriate (18+)

**Documents:**
- ✓ Profile photo clear and recent
- ✓ Driver's license valid and not expired
- ✓ Background check passed
- ✓ Vehicle registration current
- ✓ Vehicle insurance active
- ✓ All documents readable

**Vehicle Information:**
- ✓ Vehicle make/model/year provided
- ✓ License plate valid
- ✓ Tier/class appropriate
- ✓ Vehicle appears well-maintained (from photos)

**Consents:**
- ✓ GPS tracking consent signed
- ✓ Privacy policy accepted
- ✓ Legal notice accepted
- ✓ Terms & conditions accepted
- ✓ Contract signed

**Banking:**
- ✓ Account holder name matches driver name
- ✓ Valid bank institution
- ✓ Account number provided
- ✓ Routing number (if applicable)

**Red Flags:**
- ❌ Expired documents
- ❌ Missing required documents
- ❌ Unclear photos
- ❌ Inconsistent information
- ❌ Failed background check
- ❌ Invalid vehicle information
- ❌ Suspicious banking details

---

## 📞 Support & Escalation

### If Issues Arise:
1. Add detailed notes in admin notes field
2. Mark as "UNDER_REVIEW"
3. Request additional information from driver
4. Escalate to senior admin if needed
5. Document all communications

### Contact Information:
- Internal Support: admin-support@movoprive.com
- Driver Support: support@movoprive.com
- Emergency: (XXX) XXX-XXXX

---

## 🎯 Best Practices

### For Admins:

1. **Review Thoroughly**
   - Don't rush approvals
   - Check all documents carefully
   - Verify information consistency

2. **Document Everything**
   - Add notes for all decisions
   - Record reasons for rejections
   - Keep audit trail

3. **Communicate Clearly**
   - Use professional language
   - Provide specific feedback
   - Offer support for reapplication

4. **Follow Process**
   - Use UNDER_REVIEW status appropriately
   - Don't skip verification steps
   - Maintain consistency

5. **Protect Privacy**
   - Don't share personal information
   - Use secure communication
   - Follow GDPR/privacy laws

---

## Summary

The Admin Onboarding Management system allows the Movo team to:

✅ **Review Applications** - Comprehensive application details
✅ **Verify Documents** - Individual document approval
✅ **Make Decisions** - Approve, reject, or request more info
✅ **Manage Status** - Track application progress
✅ **Communicate** - Send automated notifications
✅ **Maintain Records** - Full audit trail

All within a **user-friendly admin interface** with **secure access control** and **automated workflows**.

---

## 📞 Questions?

For technical support or questions about the onboarding system:
- Email: dev-support@movoprive.com
- Slack: #admin-support
- Documentation: See ONBOARDING_FLOW_GUIDE.md
