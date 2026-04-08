# Test Checklist

## 0. Pre-requisites
- [ ] Run the new SQL block at the bottom of `supabase/schema.sql` in Supabase SQL Editor
  - Adds `nodes.sources` (jsonb), drops `node_id NOT NULL` on contributions, adds `'import'` to contributions type check

---

## 1. Extension — Icon & Toolbar Button
- [ ] Load extension from `extension/` in Chrome (`chrome://extensions` → Load unpacked)
- [ ] Extension toolbar button shows the **LO_OM** logo (black rounded square, white text) — not a blank/puzzle piece
- [ ] Hovering the icon shows tooltip **"Loom by Peerly"**
- [ ] Load in Firefox (`about:debugging` → Load Temporary Add-on → select `manifest.json`) — same icon visible

---

## 2. Extension — Icon Click (Apply Loom)
- [ ] While on any page (e.g. `reddit.com/r/learnprogramming`), click the **LO_OM** toolbar icon
- [ ] Tab redirects to `/loom?url=https://reddit.com/r/learnprogramming`
- [ ] Import completes → redirected to `/weave/<id>`, nodes visible

---

## 3. Extension — Address Bar Prefix Flow
- [ ] Type `loom.reddit.com/r/learnprogramming` in address bar → tab redirects to `/loom?url=...`
- [ ] **Auth guard**: do the above while logged out → redirects to `/sign-in?redirect_url=/loom?url=...`, after sign-in completes import
- [ ] **Deduplication**: trigger the same URL again → redirects to existing weave instantly (no re-generation)
- [ ] **Firefox**: same flow works, no `chrome is not defined` error in console

---

## 4. Extension — Query Mode
> Browsers treat bare words as search queries so the extension can't intercept them from the address bar. Test `?q=` directly via the ngrok URL.
- [ ] Go to `https://cary-funnier-lauryn.ngrok-free.dev/loom?q=machine+learning`
- [ ] Loading copy says **"Searching Reddit for `machine learning`…"** (not "Weaving from…")
- [ ] Import completes → redirected to `/weave/<id>`

---

## 5. Import — Nodes are Scaffolds with Sources
- [ ] After any Reddit import, open the resulting weave
- [ ] All nodes show the **"AI Draft"** badge — none show as community-contributed
- [ ] Verify in Supabase: `select is_scaffold, contributed_by, sources from nodes where weave_id = '<id>'`
  - `is_scaffold = true`, `contributed_by = null`
  - `sources` is a JSON array with 1-3 objects each containing `title`, `url`, `score`, `subreddit`

---

## 6. Import — Source Posts Visible on Node Detail
- [ ] Open any imported node (`/node/<weaveId>/<nodeId>`)
- [ ] Below the stats grid, a **"Based on N Reddit posts"** section appears
- [ ] Each source shows: post title, subreddit, upvote count, external link icon
- [ ] Clicking a source opens the Reddit post in a new tab

---

## 7. Import — Importer Earns Lumens
- [ ] Import a new URL (not a duplicate)
- [ ] Importer earned **+10 LM** (check profile or leaderboard)
- [ ] Verify in Supabase: `select * from contributions where weave_id = '<id>' and type = 'import'`
  - Row exists: `lumens_earned = 10`, `node_id = null`

---

## 8. Scaffold Fill
- [ ] Click an "AI Draft" node on any weave → contribute modal opens
- [ ] Submit → badge changes from "AI Draft" to community style
- [ ] Verify: `select is_scaffold, contributed_by from nodes where id = '<node_id>'` → `false` / `<userId>`
- [ ] +50 LM earned

---

## 9. Weave Generation, Add Node, Realtime, Explainer & Upvote
- [ ] `/create` (Pro): weave + scaffold nodes inserted, no regression in AI JSON parsing
- [ ] Add Node FAB: new node appears, +25 LM, gap detection fires (~5s)
- [ ] Two tabs on same weave: scaffold fill and add node both update live without refresh
- [ ] Node explainer: generates, caches on reload, upvote toggles correctly
