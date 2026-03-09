# GroChurch Web CRM — Deployment Guide

## Quick Setup (5 Steps)

### Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `grochurch-web`
3. Set to **Private**
4. Click **Create repository**
5. Push the code:

```bash
cd grochurch-web
git init
git add .
git commit -m "Initial commit: GroChurch Web CRM"
git branch -M main
git remote add origin https://github.com/GeniusMundi10/grochurch-web.git
git push -u origin main
```

### Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `grochurch-web`
3. Set a strong database password
4. Region: **US East** (or closest to your users)
5. After creation, go to **SQL Editor**
6. Paste and run the entire contents of `supabase-schema.sql`

### Step 3: Get Supabase Keys

From your Supabase project → **Settings → API**:
- Copy `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 4: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `grochurch-web` GitHub repository
3. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
   ```
4. Click **Deploy**

### Step 5: Configure Custom Domain

1. In Vercel project → **Settings → Domains**
2. Add `app.grochurch.com`
3. Add the DNS records Vercel shows you to your domain registrar
4. In Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://app.grochurch.com`
   - **Redirect URLs**: Add `https://app.grochurch.com/**`

### Step 6: Create Admin Account

1. Go to `https://app.grochurch.com/auth/signup`
2. Create your account
3. In Supabase SQL Editor, run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |

---

## Supabase Auth Settings

In Supabase → **Authentication → Providers**:
- **Email**: Enabled ✓
- **Confirm email**: Optional (disable for easier testing)

In **Authentication → Email Templates**:
- Customize the confirmation and password reset emails with GroChurch branding

---

## Local Development

```bash
# Install dependencies
pnpm install

# Copy env template
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run dev server
pnpm dev
# Open http://localhost:3000
```

---

## Production Checklist

- [ ] Supabase schema deployed
- [ ] RLS policies enabled (already in schema)
- [ ] Admin user created and role set
- [ ] Custom domain `app.grochurch.com` configured
- [ ] Supabase redirect URLs updated
- [ ] Email templates customized
- [ ] Test sign up → sign in → dashboard flow
- [ ] Test donation entry and CSV export
- [ ] Test member CRUD operations
