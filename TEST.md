# Test Checklist

## 0. Pre-requisites
- [ ] Run the SQL block at the bottom of `supabase/schema.sql` in Supabase SQL Editor
  - Creates `node_upvotes` table, `nodes.upvotes` column, `increment/decrement_node_upvotes` RPCs
- [ ] Confirm `contributions` table accepts `type = 'import'` and `node_id = null`
  - If not: `ALTER TABLE contributions ALTER COLUMN node_id DROP NOT NULL;`

---

## 1. Extension — Icon & Toolbar Button
- [ ] Load extension from `extension/` in Chrome (`chrome://extensions` → Load unpacked)
- [ ] Extension icon (Peerly logo) appears in the Chrome toolbar — not a blank/puzzle piece
- [ ] Hovering the icon shows tooltip "Loom by Peerly"
- [ ] Load in Firefox (`about:debugging` → Load Temporary Add-on → select `manifest.json`) — same icon visible

---

## 2. Extension — URL Import Flow
- [ ] Type `loom.reddit.com/r/learnprogramming` in address bar → tab redirects to `/loom?url=https://reddit.com/r/learnprogramming`
- [ ] **Auth guard**: do the above while logged out → redirects to `/sign-in?redirect_url=/loom?url=...`, after sign-in lands back on loom page and completes import
- [ ] Import completes → redirected to `/weave/<id>`, nodes visible
- [ ] **Deduplication**: type the same `loom.reddit.com/r/learnprogramming` again → redirects to the existing weave instantly (no re-generation)
- [ ] **Firefox**: same URL flow works, no `chrome is not defined` error in browser console

---

## 3. Extension — Query Mode
> Browsers treat bare words like `loom.machine-learning` as a search query and never navigate to them, so the extension can't intercept it from the address bar. Test the `?q=` path directly against the ngrok app instead.
- [ ] Go to `https://cary-funnier-lauryn.ngrok-free.dev/loom?q=machine+learning`
- [ ] Loading copy says **"Searching Reddit for `machine learning`…"** (not "Weaving from…")
- [ ] Import completes → redirected to `/weave/<id>`, nodes visible and marked as AI Draft

---

## 4. Loom Import — Nodes are Scaffolds
- [ ] After any import (URL or query), open the resulting weave
- [ ] All nodes show the **"AI Draft"** badge (yellow) — none show as community-contributed
- [ ] Verify in Supabase: `select is_scaffold, contributed_by from nodes where weave_id = '<id>'`
  - All rows: `is_scaffold = true`, `contributed_by = null`

---

## 5. Loom Import — Importer Earns Lumens
- [ ] Import a new URL (not a duplicate)
- [ ] Check profile or leaderboard → importer earned **+10 LM**
- [ ] Verify in Supabase: `select * from contributions where weave_id = '<id>' and type = 'import'`
  - Row exists with `lumens_earned = 10`, `node_id = null`

---

## 6. Loom Import — Manual Query (`/loom?q=`)
- [ ] Go to `https://cary-funnier-lauryn.ngrok-free.dev/loom?q=machine+learning` (same as section 3 — this is the only way to trigger query mode)
- [ ] Loading copy says **"Searching Reddit for `machine learning`…"**
- [ ] Weave created, nodes are scaffolds (`is_scaffold = true`), descriptions contain real Reddit content (not generic summaries)

---

## 7. Scaffold Fill (`/weave/<id>` → contribute modal)
- [ ] Click an "AI Draft" node → contribute modal opens
- [ ] Submit title + description → node updates: badge changes from "AI Draft" to community style
- [ ] Verify in Supabase: `select is_scaffold, contributed_by from nodes where id = '<node_id>'`
  - `is_scaffold = false`, `contributed_by = <userId>`
- [ ] +50 LM earned (check profile or leaderboard)

---

## 8. Weave Generation (`/create`)
- [ ] Create a weave as a Pro user → weave and nodes inserted
- [ ] Verify in Supabase: `select * from nodes where weave_id = '<new_id>'` returns rows with `is_scaffold = true`
- [ ] Nodes use shared `parseJSON` — no regression in JSON parsing (malformed AI output still handled gracefully)

---

## 9. Add Node
- [ ] Click the + FAB on `/weave/<id>` → add node panel
- [ ] Submit → new node appears in weave viewer, `is_scaffold = false`
- [ ] +25 LM earned
- [ ] Gap detection fires: check Supabase ~5s later for any new scaffold nodes inserted

---

## 10. Realtime
- [ ] Open same `/weave/<id>` in two tabs
- [ ] Tab B: fill a scaffold node → Tab A updates without refresh (scaffold → community node live)
- [ ] Tab B: add a node → Tab A shows it without refresh

---

## 11. Add Perspective (`/node/<weaveId>/<nodeId>`)
- [ ] Open a community node → submit a perspective
- [ ] `description` updated with `\n\n---\n\n**author:** ...` appended
- [ ] +25 LM earned

---

## 12. Node Explainer & Upvote
- [ ] Click "Full Deep Dive" → explainer generated
- [ ] Reload → explainer loads instantly from cache (`nodes.explainer` not null)
- [ ] Upvote → `node_upvotes` row inserted, count incremented
- [ ] Upvote again → row deleted, count decremented
