# ENVIRONMENT VARIABLES SETUP GUIDE
## Complete Configuration for All Services

**Last Updated:** June 4, 2026, 9:01 AM UTC+01:00

---

# REQUIRED ENVIRONMENT VARIABLES

## 1. DATABASE
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```
- **Provider:** PostgreSQL
- **Host:** aws-0-eu-west-1.pooler.supabase.com
- **Port:** 5432
- **Database:** postgres

---

## 2. AUTHENTICATION & SESSIONS
```bash
SESSION_SECRET=your_random_secret_key_min_32_chars
NEXT_PUBLIC_APP_URL=https://movoprive.com
NEXT_PUBLIC_BASE_URL=https://movoprive.com
```

**How to generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. EMAIL SERVICE (RESEND)
```bash
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@movoprive.com
FROM_NAME=MOVO
NEXT_PUBLIC_APP_NAME=MOVO
SUPPORT_EMAIL=support@movoprive.com
LOGO_URL=https://movoprive.com/logo.png
```

**How to get Resend API Key:**
1. Go to https://resend.com
2. Sign up or log in
3. Navigate to API Keys
4. Create new API key
5. Copy the key starting with `re_`

---

## 4. SMS SERVICE (TWILIO)
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**How to get Twilio credentials:**
1. Go to https://www.twilio.com
2. Sign up or log in
3. Go to Console Dashboard
4. Copy Account SID and Auth Token
5. Get a Twilio phone number (or use existing)

**Twilio Phone Number Format:** Must include country code (e.g., +1 for US, +44 for UK)

---

## 5. GOOGLE OAUTH
```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

**How to get Google OAuth credentials:**
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `https://movoprive.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (for development)
6. Copy Client ID and Client Secret

---

## 6. STRIPE (PAYMENTS)
```bash
STRIPE_PUBLIC_KEY=pk_live_your_public_key
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**How to get Stripe keys:**
1. Go to https://dashboard.stripe.com
2. Sign up or log in
3. Go to Developers → API Keys
4. Copy Publishable Key and Secret Key
5. For webhook secret, go to Webhooks and create endpoint for:
   - `https://movoprive.com/api/stripe/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

---

## 7. GOOGLE MAPS
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
```

**How to get Google Maps API Key:**
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable Maps JavaScript API, Geocoding API, Places API
4. Create API key (Restrict to HTTP referrers)
5. Add allowed referrers:
   - `https://movoprive.com`
   - `https://*.movoprive.com`

---

## 8. OPENAI (AI FEATURES)
```bash
OPENAI_API_KEY=sk_your_api_key
```

**How to get OpenAI API Key:**
1. Go to https://platform.openai.com
2. Sign up or log in
3. Go to API Keys
4. Create new secret key
5. Copy the key (starts with `sk_`)

---

# ENVIRONMENT FILE STRUCTURE

## .env.local (Development)
```bash
# Database
DATABASE_URL=postgresql://...

# Auth
SESSION_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Email
RESEND_API_KEY=...
FROM_EMAIL=noreply@movoprive.com
FROM_NAME=MOVO
NEXT_PUBLIC_APP_NAME=MOVO
SUPPORT_EMAIL=support@movoprive.com
LOGO_URL=https://movoprive.com/logo.png

# SMS
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Payments
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# AI
OPENAI_API_KEY=...
```

## .env.production (VPS)
Same structure as .env.local but with production keys:
- Use production Stripe keys (pk_live_, sk_live_)
- Use production Google OAuth credentials
- Use production database URL
- Use production Resend API key

---

# DEPLOYMENT CHECKLIST

## Before Deploying to VPS

- [ ] All required environment variables set in `.env.production`
- [ ] Database migrations run: `npx prisma migrate deploy`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Build successful: `npm run build`
- [ ] No TypeScript errors
- [ ] All tests passing

## On VPS

1. **SSH to VPS:**
   ```bash
   ssh root@srv1691570
   ```

2. **Navigate to project:**
   ```bash
   cd /path/to/movo-app
   ```

3. **Set environment variables:**
   ```bash
   # Edit .env.production or use environment variables
   nano .env.production
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

6. **Build application:**
   ```bash
   npm run build
   ```

7. **Start with PM2:**
   ```bash
   pm2 start npm --name movo -- start
   ```

8. **Verify:**
   ```bash
   pm2 logs movo
   curl https://movoprive.com
   ```

---

# TESTING ENVIRONMENT VARIABLES

## Test Email (Resend)
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Test SMS (Twilio)
```bash
curl -X POST http://localhost:3000/api/auth/admin/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1234567890"}'
```

## Test Google OAuth
Visit: `http://localhost:3000/api/auth/google`

## Test Stripe
Visit: `http://localhost:3000/home/payment`

---

# TROUBLESHOOTING

### Email not sending
- Check `RESEND_API_KEY` is valid
- Check `FROM_EMAIL` is verified in Resend
- Check logs: `pm2 logs movo | grep -i email`

### SMS not sending
- Check `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
- Check `TWILIO_PHONE_NUMBER` format (must include country code)
- Check logs: `pm2 logs movo | grep -i sms`

### Google OAuth not working
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Check redirect URI matches exactly
- Check logs: `pm2 logs movo | grep -i google`

### Database connection failing
- Check `DATABASE_URL` is correct
- Check database is running
- Check network access from VPS to database host
- Test connection: `psql $DATABASE_URL`

### Stripe not working
- Check keys are for correct environment (test vs live)
- Check webhook secret is correct
- Check webhook endpoint is accessible
- Test: `curl https://movoprive.com/api/stripe/webhook`

---

# SECURITY BEST PRACTICES

1. **Never commit .env files to git**
   ```bash
   # .gitignore should contain:
   .env
   .env.local
   .env.production
   ```

2. **Use strong SESSION_SECRET**
   - Minimum 32 characters
   - Random and unique
   - Never reuse across environments

3. **Rotate API keys regularly**
   - Resend: Monthly
   - Twilio: Quarterly
   - Stripe: Quarterly
   - Google: Annually

4. **Use environment-specific keys**
   - Development: Test keys
   - Production: Live keys
   - Never use live keys in development

5. **Restrict API key access**
   - Stripe: IP whitelist
   - Google: Domain whitelist
   - Twilio: Account restrictions

---

# QUICK REFERENCE

| Service | Variable | Example | Required |
|---------|----------|---------|----------|
| Database | DATABASE_URL | postgresql://... | ✅ |
| Session | SESSION_SECRET | random_32_chars | ✅ |
| Email | RESEND_API_KEY | re_... | ✅ |
| SMS | TWILIO_ACCOUNT_SID | AC... | ✅ |
| OAuth | GOOGLE_CLIENT_ID | ...apps.googleusercontent.com | ✅ |
| Payments | STRIPE_SECRET_KEY | sk_... | ✅ |
| Maps | NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | AIza... | ✅ |
| AI | OPENAI_API_KEY | sk_... | ❌ |

---

**Status:** Ready for production deployment

