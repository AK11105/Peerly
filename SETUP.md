# Peerly — Setup Guide

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Clerk](https://clerk.com) account (free tier is fine)

---

## 1. Supabase Setup

### Create a Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, region, and database password → **Create project**
3. Wait ~1 minute for provisioning

### Run the Schema

1. In your Supabase dashboard → **SQL Editor → New query**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run**

This creates all 9 tables, RLS policies, functions, and the leaderboard view.

### Get Your Keys

Go to **Project Settings → API**:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" field |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret) |

---

## 2. Clerk Setup

### Create an Application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → **Create application**
2. Enable **Email** and/or **Google** sign-in → **Create application**

### Get Your Keys

Go to **API Keys**:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key |
| `CLERK_SECRET_KEY` | Secret key |

### Webhook Setup (for billing plan sync)

**Local dev with ngrok:**

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
# Copy the https URL, e.g. https://abc123.ngrok-free.app
```

In Clerk Dashboard → **Webhooks → Add endpoint**:
- URL: `https://abc123.ngrok-free.app/api/webhooks/clerk`
- Events: `subscriptionItem.active`, `subscriptionItem.canceled`, `subscriptionItem.ended`, `user.deleted`
- Copy the **Signing Secret** → that's your `CLERK_WEBHOOK_SECRET`

> ngrok gives a new URL on every restart — update the webhook endpoint in Clerk each time, or use a [free static ngrok domain](https://dashboard.ngrok.com/domains).

### Billing / Pro Plan (optional)

1. Clerk Dashboard → **Configure → Billing** → toggle **Enable Billing** on, set Payer type to **User**
2. **Billing → Plans → Create plan**: Name `Pro`, Slug `pro`, Price `$9/month`

---

## 3. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk — from dashboard.clerk.com → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/explore
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/explore

# Supabase — from Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI — from aistudio.google.com (free)
GEMINI_API_KEY=your-gemini-api-key
```

---

## 4. Install & Run

```bash
npm install
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Seed sample data (recommended)

```bash
npm run seed
```

Populates 4 weaves (Machine Learning, Organic Chemistry, Roman History, Web Development) with nodes, users, lumens, and community messages. Run this before testing — the leaderboard, profile, and @mention autocomplete all depend on users existing in the DB.

---

## 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all the same env vars in **Vercel → Project → Settings → Environment Variables**.

For production, swap in your live Clerk keys (`pk_live_` / `sk_live_`) from the Production Clerk instance, and update the webhook endpoint URL to your deployed domain.

> The Python backend (`/backend`) is not used and does not need to run.
