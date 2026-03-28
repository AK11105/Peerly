# Peerly — Project Status

Last updated: 2026-03-28 (session 2)

---

## What was done

### Architecture migration (Python → Next.js + Supabase)

The original project had a Next.js frontend proxying to a Python/FastAPI backend that stored data in a flat `weaves.json` file and called a local Ollama instance for AI. The entire backend has been replaced.

**Old stack:**
```
Next.js → Python FastAPI (localhost:8000) → weaves.json + Ollama (localhost:11434)
```

**New stack:**
```
Next.js → Supabase (Postgres + Realtime) + Google Gemini API
```

The Python backend (`/backend`) is no longer used and does not need to run.

---

## Database (`supabase-schema.sql`)

### Tables

| Table | Purpose |
|---|---|
| `weaves` | Weave records — `nodes` stored as JSONB array |
| `users` | Lightweight user profiles (username only for MVP) |
| `lumens` | Per-user token wallet with `balance` |
| `contributions` | One row per node contribution (scaffold_fill / add_node / perspective) |
| `weave_admins` | Which users admin which weave |
| `user_weaves` | User's bookmarked/created weaves (replaces localStorage) |
| `community_messages` | Per-weave, per-channel chat messages |
| `community_replies` | Threaded replies on messages |
| `community_upvotes` | Vote tracking — prevents double-voting (PK on username + target_id) |

### Postgres Functions

| Function | Purpose |
|---|---|
| `ensure_user(username)` | Upserts user + lumens wallet on first action |
| `earn_lumens(username, amount)` | Atomically increments balance |
| `spend_lumens(username, amount)` | Atomically decrements balance, raises if insufficient |
| `toggle_message_upvote(username, message_id)` | Flips vote, updates upvote count, earns 1 LM |
| `toggle_reply_upvote(username, reply_id)` | Same for replies |

### Views

| View | Purpose |
|---|---|
| `leaderboard_view` | Live join of `users` + `lumens` + `contributions` — computes `rep` score, always current |

### Realtime enabled on
`weaves`, `lumens`, `contributions`, `community_messages`, `community_replies`, `community_upvotes`

---

## New files created

### Next.js API routes (`app/api/`)

| Route | Method(s) | Replaces |
|---|---|---|
| `/api/weaves/generate` | POST | Python `generate_weave` + `store.save_weave` |
| `/api/weaves/[weaveId]/nodes` | POST | Python `add_node` + background gap detection |
| `/api/weaves/[weaveId]/contribute` | POST | Python `contribute_node` |
| `/api/weaves/[weaveId]/nodes/[nodeId]/contribute` | POST | Python `add_perspective` |
| `/api/nodes/explain` | POST | Python `explain_node` (now Gemini, was Ollama) |
| `/api/community/[weaveId]/messages` | GET / POST / DELETE | — (new) |
| `/api/community/messages/[messageId]/replies` | POST / DELETE | — (new) |
| `/api/community/messages/[messageId]/upvote` | POST | — (new) |
| `/api/community/replies/[replyId]/upvote` | POST | — (new) |
| `/api/leaderboard` | GET | — (new, queries `leaderboard_view`) |

All dynamic route `params` are properly awaited (Next.js 16 requirement).

### Library files (`lib/`)

| File | Purpose |
|---|---|
| `lib/supabase.ts` | Supabase client (anon key, browser-safe) |
| `lib/community.ts` | Client wrappers for all community API calls + `subscribeCommunity` realtime helper |

### Hooks (`hooks/`)

| File | Purpose |
|---|---|
| `hooks/use-realtime-weave.ts` | Subscribes to `postgres_changes` on a specific weave row — weave page updates live when gap detection inserts a scaffold |

### Scripts (`scripts/`)

| File | Purpose |
|---|---|
| `scripts/seed.mjs` | Wipes all tables then seeds 4 weaves (Machine Learning, Organic Chemistry, Roman History, Web Development) with nodes, users, lumens, community messages, and replies. Run: `npm run seed` |

### Docs

| File | Purpose |
|---|---|
| `SETUP.md` | Full setup guide — first-time and incremental DB update instructions |
| `INTEGRATION.md` | Architecture overview (rewritten from old Ollama/FastAPI docs) |
| `STATUS.md` | This file |

---

## Modified files

### `lib/api.ts`
- `fetchWeave` / `fetchAllWeaves` now query Supabase directly (no HTTP call to Python)
- Mutation calls (`generateWeave`, `addNode`, `contributeToScaffold`, `addPerspective`) hit the new Next.js API routes

### `lib/my-weaves.ts`
- Replaced localStorage with `user_weaves` Supabase table
- All functions are now async

### `lib/lumens-context.tsx`
- Replaced localStorage with `lumens` Supabase table
- `earn` / `spend` are now async and call `earn_lumens` / `spend_lumens` Postgres functions
- Balance subscribes to Supabase Realtime — updates instantly across tabs/devices

### `next.config.mjs`
- Removed the Python proxy rewrite (`/api/*` → `localhost:8000`)

### `.env.local`
- Replaced `NEXT_PUBLIC_API_URL` + `ANTHROPIC_API_KEY` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`

### `package.json`
- Added `@supabase/supabase-js`, `@google/generative-ai`
- Removed `@anthropic-ai/sdk`
- Added `"seed": "node scripts/seed.mjs"` script

### `app/weave/[id]/page.tsx`
- Uses `useRealtimeWeave` hook — weave updates live without polling

### `app/create/page.tsx`
- Removed Ollama polling fallback (12-attempt loop)
- Loading text updated to "Gemini is building your Weave…"
- `addMyWeaveId` awaited (now async)

### `app/my-weaves/page.tsx`
- `getMyWeaveIds` / `removeMyWeaveId` awaited (now async)

### `app/profile/page.tsx`
- Contributions loaded from `contributions` DB table instead of scanning node arrays
- `spend` awaited (now async)

### `app/admin/page.tsx`
- `getMyWeaveIds` awaited inside async IIFE

### `app/leaderboard/page.tsx`
- Fully replaced — fetches from `/api/leaderboard` (live `leaderboard_view`)
- No more hardcoded static leaderboard data

### `components/peerly/community-hub.tsx`
- Loads messages from Supabase on channel switch
- Subscribes to Realtime — new messages appear without polling
- All send / reply / delete / upvote actions persist to Supabase
- Fixed flash bug: realtime subscription ignores initial connect event (500ms `ready` guard)
- Falls back to seed data for `weaveId === 'global'`

### `components/peerly/contribute-modal.tsx`
- Removed 15s polling (Realtime handles gap detection scaffolds)
- `earn` awaited (now async)
- Removed stale "is the backend running?" error message

### `components/peerly/add-node-panel.tsx`
- Removed 15s polling
- `earn` awaited (now async)
- Removed stale error message

### `components/peerly/add-perspective-modal.tsx`
- Removed `API_BASE` / `localhost:8000` fallback — uses relative `/api/...` path
- Fixed error message

### `components/peerly/redeem-dialog.tsx`
- `handleConfirm` is now async, awaits `spend`

### `app/node/[weaveId]/[nodeId]/page.tsx`
- "Ollama is writing your explainer…" → "Gemini is writing your explainer…"
- Fixed error message

### `INTEGRATION.md`
- Fully rewritten — old Ollama/FastAPI content replaced with current architecture

---

## AI provider

Switched from **Ollama (local llama3)** → **Google Gemini 2.0 Flash** (`gemini-2.0-flash`) via `@google/generative-ai`.

Used in:
- Weave generation (`/api/weaves/generate`)
- Gap detection (background, fires after node contributions)
- Node explainer (`/api/nodes/explain`)

---

## Known state

- `demo_user` is the hardcoded current user throughout (no auth system yet)
- Community hub seed data (topic-specific messages) still renders as fallback when `weaveId === 'global'` or before DB loads
- The Python `/backend` directory is still present but unused

---

## DB integration fixes (2026-03-28, session 2)

### Bugs fixed

| File | Fix |
|---|---|
| `app/api/weaves/[weaveId]/nodes/[nodeId]/contribute/route.ts` | Added `ensure_user`, `contributions` insert (`type: 'perspective'`, 25 LM), and `earn_lumens` call — perspectives now persist to DB and appear on profile/leaderboard |
| `components/peerly/contribute-modal.tsx` | Removed stale 15s `fetchWeave` poll that referenced an unimported function (would have thrown `ReferenceError` at runtime) |
| `app/weave/[id]/page.tsx` | Wired `useRealtimeWeave` hook — `weave` state is now driven by the realtime subscription seeded by the initial fetch; gap detection scaffolds appear live |
| `app/admin/page.tsx` | Replaced `getMyWeaveIds` fallback with a direct `weave_admins` query — admin panel now only shows weaves where `demo_user` is an actual admin |
| `app/profile/page.tsx` | Rep score now matches DB formula (`contributions * 50 + balance / 10`); global rank fetched live from `/api/leaderboard` instead of hardcoded `#142` |
| `app/api/community/[weaveId]/messages/route.ts` | DELETE verifies message ownership before deleting (returns 403 if username doesn't match) |
| `app/api/community/messages/[messageId]/replies/route.ts` | Same ownership check for reply DELETE |
| `lib/community.ts` | `deleteMessage` / `deleteReply` now pass `username` in request body |
| `components/peerly/community-hub.tsx` | Replaced hardcoded `KNOWN_USERS` array with `knownUsers` state loaded from `users` table — @mention autocomplete reflects real users |

### Schema fixes

| File | Fix |
|---|---|
| `supabase/schema.sql` | Replaced stale single-table file with full schema (all 9 tables, RLS, 5 functions, `leaderboard_view`) — now safe for `supabase db reset` |
| `supabase/schema.sql` + `supabase-schema.sql` | `alter publication` lines replaced with idempotent DO block (checks `pg_publication_tables` before adding) — no error on re-run |
| `supabase/schema.sql` | All `create policy` statements prefixed with `drop policy if exists` — no duplicate policy error on re-run |
| `supabase/schema.sql` | Double semicolons (`;;`) from regex replacement cleaned up |

### Docs updated

- `SETUP.md` — reflects schema file clarification, seed step importance, what-to-test checklist, updated How It Works table
