# VPS DEPLOYMENT COMMANDS
## Push to Production & Restart

**VPS Host:** `root@srv1691570`  
**Project Path:** `/path/to/movo-app` (adjust as needed)  
**Branch:** `master`

---

# QUICK DEPLOYMENT (Copy & Paste)

## Step 1: SSH to VPS
```bash
ssh root@srv1691570
```

## Step 2: Navigate to Project
```bash
cd /path/to/movo-app
```

## Step 3: Pull Latest Code
```bash
git pull origin master
```

## Step 4: Install Dependencies (if needed)
```bash
npm install
```

## Step 5: Build
```bash
npm run build
```

## Step 6: Restart PM2
```bash
pm2 restart movo
```

## Step 7: Verify
```bash
pm2 logs movo
```

---

# COMPLETE DEPLOYMENT SCRIPT (All-in-One)

Copy and paste this entire block:

```bash
ssh root@srv1691570 << 'EOF'
cd /path/to/movo-app
git pull origin master
npm install
npm run build
pm2 restart movo
pm2 logs movo
EOF
```

---

# INDIVIDUAL COMMANDS

### SSH Connection
```bash
ssh root@srv1691570
```

### Pull Latest Code
```bash
git pull origin master
```

### Check Git Status
```bash
git status
```

### View Recent Commits
```bash
git log --oneline -10
```

### Build Application
```bash
npm run build
```

### Restart PM2 App
```bash
pm2 restart movo
```

### View Live Logs
```bash
pm2 logs movo
```

### Stop Logs (Ctrl+C)
```
Press Ctrl+C
```

### Check PM2 Status
```bash
pm2 status
```

### View All PM2 Apps
```bash
pm2 list
```

---

# TROUBLESHOOTING COMMANDS

### If Build Fails
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run build
```

### If PM2 Won't Restart
```bash
# Stop the app
pm2 stop movo

# Delete from PM2
pm2 delete movo

# Start fresh
pm2 start npm --name movo -- start
```

### Check Disk Space
```bash
df -h
```

### Check Memory Usage
```bash
free -h
```

### View Environment Variables
```bash
cat .env.production
```

---

# WHAT GETS DEPLOYED

**Latest Commits:**
1. ✅ Fixed `/user/register` page (missing page created)
2. ✅ Fixed fleet onboarding vehicle form (firstVehicleModel field)
3. ✅ Email system audit (documentation)
4. ✅ Cookies banner verification (fully functional)

**Total Changes:** 7 commits since last deployment

---

# VERIFICATION AFTER DEPLOYMENT

### Test 1: Check if App is Running
```bash
curl https://movoprive.com
```

### Test 2: Check Specific Routes
```bash
# User registration page
curl https://movoprive.com/user/register

# Fleet onboarding vehicle
curl https://movoprive.com/driver/onboarding/partner/vehicle

# Home page
curl https://movoprive.com/home
```

### Test 3: Check Logs for Errors
```bash
pm2 logs movo | grep -i error
```

### Test 4: Check Build Status
```bash
# Should show "Compiled successfully"
pm2 logs movo | grep -i "compiled"
```

---

# ENVIRONMENT VARIABLES TO CHECK

Make sure these are set in `.env.production` on VPS:

```bash
# Google OAuth (for sign-in)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Email (Resend)
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=noreply@movoprive.com
FROM_NAME=MOVO

# App Config
NEXT_PUBLIC_APP_URL=https://movoprive.com
NEXT_PUBLIC_APP_NAME=MOVO
NEXT_PUBLIC_BASE_URL=https://movoprive.com
SUPPORT_EMAIL=support@movoprive.com
LOGO_URL=https://movoprive.com/logo.png

# Database
DATABASE_URL=your_database_url

# Session
SESSION_SECRET=your_session_secret
```

---

# ROLLBACK (If Needed)

### View Previous Commits
```bash
git log --oneline -20
```

### Rollback to Previous Commit
```bash
git reset --hard HEAD~1
npm run build
pm2 restart movo
```

### Rollback to Specific Commit
```bash
git reset --hard <commit-hash>
npm run build
pm2 restart movo
```

---

# MONITORING

### Watch Logs in Real-Time
```bash
pm2 logs movo --lines 100 --follow
```

### Monitor CPU & Memory
```bash
pm2 monit
```

### Check App Uptime
```bash
pm2 info movo
```

---

# QUICK REFERENCE

| Task | Command |
|------|---------|
| SSH to VPS | `ssh root@srv1691570` |
| Pull code | `git pull origin master` |
| Build | `npm run build` |
| Restart | `pm2 restart movo` |
| View logs | `pm2 logs movo` |
| Check status | `pm2 status` |
| Stop app | `pm2 stop movo` |
| Start app | `pm2 start movo` |

---

**Ready to deploy!**

