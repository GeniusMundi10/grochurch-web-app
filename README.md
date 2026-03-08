# GroChurch Web CRM — app.grochurch.com

A fully functional Next.js 16 web CRM application for the GroChurch Pastors@Risk™ platform. This is the companion web application to the GroChurch mobile app, designed to be hosted at **app.grochurch.com**.

## Features

### Core CRM
- **Dashboard** — Real-time stats, donation analytics, member growth charts, and recent activity
- **Members** — Full member management with search, filtering, profile views, and editing
- **Donations** — Complete donation tracking with CSV export, filtering by date/status, and analytics
- **Services & Plans** — Manage Rescue ($500/mo) and Thrive ($1,000/mo) plan subscriptions
- **Events** — Create and manage coaching sessions, webinars, and ministry events
- **Messages** — Internal messaging with broadcast capability
- **Prayer Requests** — Submit, track, and manage prayer requests with status updates
- **Settings** — Profile management, security settings, and notification preferences
- **Admin Panel** — System administration for admin users

### Authentication
- Email/password sign in and sign up
- Forgot password with email reset
- Protected routes with middleware
- Role-based access control (Admin, Pastor, Member, Donor)

### Technical Stack
- **Framework**: Next.js 16 (App Router)
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Language**: TypeScript

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/GeniusMundi10/grochurch-web.git
cd grochurch-web
pnpm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key from **Settings → API**

### 3. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Development Server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 5. Create Admin User

After signing up, go to Supabase SQL Editor and run:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Deployment on Vercel (for app.grochurch.com)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Set custom domain to `app.grochurch.com`
5. In Supabase, add `https://app.grochurch.com` to **Authentication → URL Configuration → Site URL**

## Service Plans

| Plan | Price | Features |
|------|-------|---------|
| Donation | Flexible | Support the mission |
| Rescue | $500/mo | Monthly 1:1 support, crisis triage, sermon architecture |
| Thrive | $1,000/mo | Weekly coaching, full strategy, custom 90-day plans |

## Database Schema

The app uses the following Supabase tables:
- `profiles` — User profiles extending auth.users
- `donations` — All donation records
- `service_subscriptions` — Plan subscriptions
- `prayer_requests` — Prayer request tracking
- `events` — Ministry events and coaching sessions
- `event_attendees` — Event registrations
- `messages` — Internal messaging
- `resources` — Ministry resources and content
- `coaching_sessions` — 1:1 coaching session records

## About GroChurch

GroChurch is a pastoral renewal platform founded by Dr. Steve Bonenberger, Ph.D. The platform provides a safe, confidential, and founder-led pathway for pastors to find clarity, care, and courage.

- **Website**: [grochurch.com](https://grochurch.com)
- **App**: [app.grochurch.com](https://app.grochurch.com)
