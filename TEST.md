# Test Checklist

## 0. Pre-requisites
- [ ] Run the new SQL block at the bottom of `supabase/schema.sql` in Supabase SQL Editor
  - Creates `node_upvotes` table, `nodes.upvotes` column, `increment/decrement_node_upvotes` RPCs

---

## 1. Weave Generation (`/create`)
- [ ] Create a weave as a Pro user → weave row inserted in `weaves`, nodes inserted as rows in `nodes` table (not in `weaves.nodes` JSONB)
- [ ] Verify in Supabase: `select * from nodes where weave_id = '<new_id>'` returns rows
- [ ] Verify `weaves` row has no `nodes` column data (or column is empty/null if not yet dropped)

---

## 2. Loom Import (Extension flow)
- [ ] Install extension from `extension/` folder in Chrome (`chrome://extensions` → Load unpacked)
- [ ] Type `loom.reddit.com/r/learnprogramming` in address bar → should redirect to `/loom?url=...`
- [ ] **Auth guard**: do the above while logged out → should redirect to `/sign-in?redirect_url=/loom?url=...`, then after sign-in land back on loom page and complete import
- [ ] Import completes → redirected to `/weave/<id>`, nodes visible
- [ ] **Deduplication**: import the same URL again → should redirect to the existing weave instantly (no re-generation)
- [ ] Verify nodes in Supabase: `select * from nodes where weave_id = '<id>'`

---

## 3. Loom Import (Manual, `/loom?q=`)
- [ ] Navigate to `/loom?q=machine+learning` → weave generated from Reddit search
- [ ] Nodes have real content (not generic summaries) — check a few descriptions

---

## 4. Realtime (open two browser tabs on same weave)
- [ ] Tab A: open `/weave/<id>`
- [ ] Tab B: add a node via the Add Node panel
- [ ] Tab A: new node appears without refresh (Realtime subscription on `nodes` table)
- [ ] Tab A: scaffold fill by another user → node updates from "AI Draft" to "Community" without refresh

---

## 5. Scaffold Fill (`/weave/<id>` → contribute modal)
- [ ] Click a scaffold node (yellow "AI Draft" badge) → contribute modal opens
- [ ] Submit title + description → node updates: `is_scaffold` becomes `false`, `contributed_by` set
- [ ] +50 LM earned (check profile or leaderboard)
- [ ] Verify in Supabase: `select is_scaffold, contributed_by from nodes where id = '<node_id>'`

---

## 6. Add Node
- [ ] Click the + FAB on `/weave/<id>` → add node panel
- [ ] Submit → new node row in `nodes` table, appears in weave viewer
- [ ] +25 LM earned
- [ ] Gap detection fires: check Supabase for any new scaffold nodes inserted after ~5s

---

## 7. Add Perspective (`/node/<weaveId>/<nodeId>`)
- [ ] Open a community node → "Add Your Explanation" button
- [ ] Submit perspective → node `description` updated with `\n\n---\n\n**author:** ...` appended
- [ ] +25 LM earned
- [ ] Verify in Supabase: `select description from nodes where id = '<node_id>'`

---

## 8. Node Explainer (`/node/<weaveId>/<nodeId>`)
- [ ] Click "Full Deep Dive" on any node → explainer generated
- [ ] Reload the page → explainer loads instantly (cached in `nodes.explainer`, no AI call)
- [ ] Verify in Supabase: `select explainer from nodes where id = '<node_id>'` is not null

---

## 9. Node Upvote
- [ ] Upvote a node explanation → `node_upvotes` row inserted, `nodes.upvotes` incremented
- [ ] Upvote again (toggle off) → row deleted, count decremented
- [ ] Verify in Supabase: `select upvotes from nodes where id = '<node_id>'`

---

## 10. Firefox (Extension)
- [ ] Load extension in Firefox (`about:debugging` → Load Temporary Add-on → select `manifest.json`)
- [ ] Type `loom.reddit.com/r/programming` → redirects correctly (no `chrome is not defined` error in console)

---

## 11. Cleanup (after all tests pass)
- [ ] Drop `weaves.nodes` column: `ALTER TABLE weaves DROP COLUMN IF EXISTS nodes;`
- [ ] Confirm app still works after drop
