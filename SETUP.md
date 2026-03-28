# Peerly — Setup Guide

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini — free)

---

## First-time setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, region, and database password → **Create project**
3. Wait ~1 minute for provisioning

### 2. Run the Schema

1. In your Supabase dashboard, go to **SQL Editor → New query**
2. Paste the entire contents of **`supabase/schema.sql`**
3. Click **Run**

> `supabase/schema.sql` is the canonical schema file (all 9 tables, RLS, functions, leaderboard view). It is also safe to use with `supabase db reset`.

### 3. Get Your Supabase Keys

**Project Settings → API:**

| Key | Where to find it |
|-----|-----------------|
| Project URL | "Project URL" field |
| Anon key | `anon public` |
| Service role key | `service_role` (keep secret) |

### 4. Configure Environment Variables

Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

### 5. Install & Run

```bash
npm install
npm run dev
```

### 6. Seed sample data

```bash
npm run seed
```

Populates 4 weaves (Machine Learning, Organic Chemistry, Roman History, Web Development) with nodes, users, lumens, and community messages. Run this before testing — the leaderboard, profile, and @mention autocomplete all depend on users existing in the DB.

---

## Updating an existing database

All statements in `supabase/schema.sql` use `create table if not exists` and `create or replace`, so **re-running the full file is safe** and is the recommended way to apply any updates.

If you want to apply only the new additions from the latest session, run these sections from `supabase/schema.sql` in the SQL Editor:

- The `contributions` table (if missing — needed for perspective contributions to persist)
- The `leaderboard_view` (`create or replace view leaderboard_view ...`)
- The `toggle_message_upvote` / `toggle_reply_upvote` functions (`create or replace function ...`)

---

## What to test

| Feature | How to test |
|---------|-------------|
| Weave creation | `/create` → generate a weave → should appear in `/explore` and `/my-weaves` |
| Scaffold contribution | Open a weave → click a scaffold node → contribute → +50 LM, node turns community |
| Add node | Open a weave → click `+` FAB → add a node → +25 LM |
| Add perspective | Open a community node → "Add Perspective" → +25 LM |
| Live gap detection | After contributing, a new scaffold may appear automatically (Realtime push) |
| Community hub | Open a weave → right sidebar → post a message, reply, upvote |
| Leaderboard | `/leaderboard` → should show seeded users with real rep scores |
| Profile | `/profile` → contributions list, correct rep score, real global rank |
| Admin panel | `/admin` → only shows weaves where `demo_user` is in `weave_admins` |
| Lumens wallet | Navbar LM counter updates live; click it to redeem |

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add the same four environment variables in **Vercel → Project → Settings → Environment Variables**. The Python backend (`/backend`) is no longer used and does not need to run.

---

## How It Works

| Feature | Implementation |
|---------|---------------|
| Database | Supabase Postgres (9 tables) |
| Realtime | Supabase Realtime — weave page updates live via `useRealtimeWeave` hook; community hub subscribes per-channel |
| Lumens wallet | `lumens` table, atomic `earn_lumens` / `spend_lumens` Postgres functions; balance synced via Realtime |
| Contributions | `contributions` table — one row per scaffold fill, add node, or perspective; drives profile history and leaderboard |
| Community | `community_messages` + `community_replies` + `community_upvotes`; delete requires ownership match |
| Leaderboard | `leaderboard_view` — live Postgres view: `contributions * 50 + lumens / 10` |
| Admin panel | Weave list sourced from `weave_admins` table (not `user_weaves`) |
| AI generation | Google Gemini 2.0 Flash via Next.js API routes |
| Gap detection | Fires server-side after node contributions; result pushed to clients via Realtime |
